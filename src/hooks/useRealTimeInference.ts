import { useEffect, useCallback, useRef } from 'react';
import { mediaDevices, MediaStream, registerGlobals } from 'react-native-webrtc';
import { webrtc, connectors } from '@roboflow/inference-sdk';
import Constants from 'expo-constants';
import { useVisionStore, Detection } from '../store/useVisionStore';

// Polyfill WebRTC globals for the SDK
registerGlobals();

const INFERENCE_WORKER_URL = 
  Constants.expoConfig?.extra?.inferenceWorkerUrl || 'http://localhost:8787';

export const useRealTimeInference = () => {
  const { 
    isRealTimeEnabled, 
    isPlaying,
    modelMode,
    isEnhancedMode,
    setDetections, 
    setStreaming, 
    setStreamingError,
    setImageDimensions
  } = useVisionStore();
  
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const retryCountRef = useRef<number>(0);
  const maxRetries = 3;

  const stopStreaming = useCallback(async () => {
    if (sessionRef.current) {
      console.log('Cleaning up real-time session...');
      try {
        // Clear connection timeout if it exists
        if ((sessionRef.current as any).connectionTimeout) {
          clearTimeout((sessionRef.current as any).connectionTimeout);
        }
        await sessionRef.current.cleanup();
      } catch (e) {
        console.error('Error during session cleanup:', e);
      }
      sessionRef.current = null;
    }
    if (streamRef.current) {
      console.log('Stopping local stream tracks...');
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setStreaming(false);
  }, [setStreaming]);

  const startStreaming = useCallback(async (isRetry = false) => {
    try {
      if (!isRetry) {
        retryCountRef.current = 0;
      }
      
      console.log(`Starting real-time streaming... ${isRetry ? `(Retry ${retryCountRef.current + 1}/${maxRetries})` : ''}`);
      setStreamingError(null);
      
      // Give the camera a moment to stabilize before starting the stream
      await new Promise(resolve => setTimeout(resolve, 500));

      const stream = await mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 5 } // Matches SAM3's ~5 FPS processing speed to avoid frame drops and reduce bandwidth
        }
      }) as unknown as MediaStream;

      streamRef.current = stream;
      
      // Update image dimensions from stream if possible
      setImageDimensions(640, 480);

      const turnConfigUrl = isEnhancedMode 
        ? `${INFERENCE_WORKER_URL}/v1/webrtc-turn-config/twilio`
        : `${INFERENCE_WORKER_URL}/v1/webrtc-turn-config`;

      const connector = connectors.withProxyUrl(`${INFERENCE_WORKER_URL}/v1/stream/init`, {
        turnConfigUrl
      });

      const session = await webrtc.useStream({
        source: stream as any,
        connector,
        wrtcParams: {
          // Use the separate realtime workflow for FAST mode to avoid SAM3 compatibility issues
          // Pin to realtime workflow if in enhanced mode
          workflowId: (modelMode === 'FAST' || isEnhancedMode) ? 'extra-vision-ai-realtime' : 'extra-vision-ai',
          // Use the appropriate output based on modelMode
          // In the realtime workflow, YOLO results are in "predictions"
          // In the main workflow, SAM3 results are in "predictions"
          dataOutputNames: ["predictions"],
          // We don't need a video stream output from the server
          streamOutputNames: [],
          // Help ICE connection by being explicit with STUN servers
          // These are ignored if turnConfigUrl returns a valid list
          iceServers: [],
          requestedPlan: isEnhancedMode ? 'webrtc-gpu-medium' : 'webrtc-gpu-large',
          requestedRegion: 'us',
          realtimeProcessing: true,
          // Force relay in enhanced mode to ensure Twilio TURN is used immediately 
          // and bypass STUN timeouts on restricted networks
          iceTransportPolicy: isEnhancedMode ? 'relay' : 'all',
          // Prevent pre-gathering of ICE candidates in enhanced mode
          iceCandidatePoolSize: isEnhancedMode ? 0 : undefined
        },
        onData: (data: any) => {
          // Log errors if present
          if (data.errors && data.errors.length > 0) {
            const nonGpuErrors = data.errors.filter((e: string) => !e.includes('NVML') && !e.includes('PyTorch'));
            if (nonGpuErrors.length > 0) {
              console.warn('[WebRTC] Frame errors:', nonGpuErrors);
            }
          }
          
          let predictions: any[] | null = null;
          
          if (data.serialized_output_data) {
            const serialized = data.serialized_output_data;
            
            // Try different paths for predictions
            // 1. serialized.predictions
            // 2. serialized.rapid_model (direct block ID)
            // 3. serialized.rapid_model.predictions (nested in block)
            
            const possiblePaths = [
              serialized.model_predictions, // Prioritize YOLO fast branch
              serialized.predictions,       // Fallback to SAM 3
              serialized.rapid_model,
              serialized.yolo_fast,
              serialized.yolo_fast?.predictions,
              serialized.rapid_model?.predictions,
              serialized.predictions?.predictions,
              serialized.model_predictions?.predictions
            ];

            for (const path of possiblePaths) {
              if (Array.isArray(path)) {
                predictions = path;
                break;
              }
            }
            
            if (!predictions) {
              console.log('[WebRTC] No predictions found in serialized_output_data. Keys:', Object.keys(serialized));
            }
          }
          
          // Fallback to top-level data.predictions
          if (!predictions && Array.isArray(data.predictions)) {
            predictions = data.predictions;
          }

          if (predictions && Array.isArray(predictions)) {
            const mappedDetections: Detection[] = predictions.map((p: any) => {
              // Convert center (x, y) to top-left corner [x, y, w, h]
              const centerX = p.x || 0;
              const centerY = p.y || 0;
              const width = p.width || 0;
              const height = p.height || 0;
              
              return {
                bbox: [centerX - width / 2, centerY - height / 2, width, height],
                label: p.class || p.label || p.class_name || 'unknown',
                score: p.confidence || p.score || 0,
              };
            });
            
            setDetections(mappedDetections);
          }
        },
        options: {
          disableInputStreamDownscaling: false
        }
      });

      sessionRef.current = session;
      
      // Monitor connection state
      const checkConnection = setInterval(() => {
        try {
          const pc = (session as any).pc;
          if (pc) {
            // Log full connection info for debugging
            console.log(`[WebRTC] PC State: ${pc.connectionState}, ICE State: ${pc.iceConnectionState}`);
            
            // Enhanced mode validation: Check ICE candidate types
            if (isEnhancedMode && pc.iceConnectionState === 'checking') {
              // In enhanced mode, we should only see relay candidates
              console.log('[WebRTC] Enhanced mode: Validating TURN relay usage...');
              
              // Check if we're getting STUN candidates when we shouldn't
              if (pc.iceGatheringState === 'gathering') {
                console.log('[WebRTC] ICE gathering in progress - should be TURN relay only');
              }
            }
            
            // Check if we have any remote candidates yet
            if (pc.iceConnectionState === 'checking' || pc.iceConnectionState === 'connected') {
              console.log('[WebRTC] ICE candidate gathering/connection in progress...');
            }
            
            if (pc.connectionState === 'connected') {
              console.log('[WebRTC] Connection established successfully');
              if (isEnhancedMode) {
                console.log('[WebRTC] Enhanced mode connection using Twilio TURN relay');
              }
              setStreaming(true);
              clearInterval(checkConnection);
              
              // Clear connection timeout on successful connection
              if ((sessionRef.current as any).connectionTimeout) {
                clearTimeout((sessionRef.current as any).connectionTimeout);
              }
            }
            
            if (pc.connectionState === 'failed') {
              const errorMsg = isEnhancedMode 
                ? 'Enhanced WebRTC Connection Failed - TURN relay issue'
                : 'WebRTC Connection Failed';
              console.error(`[WebRTC] ${errorMsg}`);
              
              // Implement retry logic for failed connections
              if (retryCountRef.current < maxRetries) {
                console.log(`[WebRTC] Attempting retry ${retryCountRef.current + 1}/${maxRetries} in 2 seconds...`);
                retryCountRef.current++;
                clearInterval(checkConnection);
                
                // Exponential backoff: 2s, 4s, 8s
                const retryDelay = 2000 * Math.pow(2, retryCountRef.current - 1);
                setTimeout(() => {
                  stopStreaming().then(() => {
                    startStreaming(true);
                  });
                }, retryDelay);
              } else {
                console.error(`[WebRTC] Max retries (${maxRetries}) exceeded. Connection failed permanently.`);
                setStreamingError(`${errorMsg} (Max retries exceeded)`);
                clearInterval(checkConnection);
              }
            }
            
            // Additional validation for enhanced mode
            if (isEnhancedMode && pc.iceConnectionState === 'failed') {
              console.error('[WebRTC] Enhanced mode ICE connection failed - Twilio TURN may not be working');
            }
          }
        } catch (e) {
          // Ignore errors during poll
        }
      }, 1000);
      
      // Cleanup interval after 45s if not connected (increased for cold starts + buffer)
      const connectionTimeout = setTimeout(() => {
        clearInterval(checkConnection);
        if (!sessionRef.current || (sessionRef.current.pc && sessionRef.current.pc.connectionState !== 'connected')) {
          const timeoutMsg = isEnhancedMode 
            ? '[WebRTC] Enhanced mode connection timeout after 45s - Twilio TURN may be unreachable'
            : '[WebRTC] Connection timeout after 45s';
          console.warn(timeoutMsg);
          
          // Implement retry logic for timeouts as well
          if (retryCountRef.current < maxRetries) {
            console.log(`[WebRTC] Timeout retry ${retryCountRef.current + 1}/${maxRetries} in 3 seconds...`);
            retryCountRef.current++;
            
            const retryDelay = 3000 * Math.pow(2, retryCountRef.current - 1);
            setTimeout(() => {
              stopStreaming().then(() => {
                startStreaming(true);
              });
            }, retryDelay);
          } else {
            console.error(`[WebRTC] Max timeout retries (${maxRetries}) exceeded.`);
            setStreamingError('Connection timeout (Max retries exceeded)');
          }
        }
      }, 45000);
      
      // Store timeout reference for cleanup
      (sessionRef.current as any).connectionTimeout = connectionTimeout;

    } catch (err: any) {
      console.error('Failed to start real-time streaming:', err);
      setStreamingError(err.message || 'Failed to start streaming');
      setStreaming(false);
      stopStreaming();
    }
  }, [setDetections, setStreaming, setStreamingError, stopStreaming, setImageDimensions]);

  useEffect(() => {
    if (isRealTimeEnabled && isPlaying) {
      startStreaming();
    } else {
      stopStreaming();
    }

    return () => {
      stopStreaming();
    };
  }, [isRealTimeEnabled, isPlaying, isEnhancedMode, startStreaming, stopStreaming]);

  return {
    stream: streamRef.current
  };
};

