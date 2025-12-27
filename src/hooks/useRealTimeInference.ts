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
    setDetections, 
    setStreaming, 
    setStreamingError,
    setImageDimensions
  } = useVisionStore();
  
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStreaming = useCallback(async () => {
    if (sessionRef.current) {
      console.log('Cleaning up real-time session...');
      try {
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

  const startStreaming = useCallback(async () => {
    try {
      console.log('Starting real-time streaming...');
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

      const connector = connectors.withProxyUrl(`${INFERENCE_WORKER_URL}/v1/stream/init`, {
        turnConfigUrl: `${INFERENCE_WORKER_URL}/v1/webrtc-turn-config`
      });

      const session = await webrtc.useStream({
        source: stream as any,
        connector,
        wrtcParams: {
          // Use the separate realtime workflow for FAST mode to avoid SAM3 compatibility issues
          workflowId: modelMode === 'FAST' ? 'extra-vision-ai-realtime' : 'extra-vision-ai',
          // Use the appropriate output based on modelMode
          // In the realtime workflow, YOLO results are in "predictions"
          // In the main workflow, SAM3 results are in "predictions"
          dataOutputNames: ["predictions"],
          // We don't need a video stream output from the server
          streamOutputNames: [],
          // Help ICE connection by being explicit with STUN servers
          iceServers: [
            { urls: ["stun:stun.l.google.com:19302"] },
            { urls: ["stun:stun1.l.google.com:19302"] },
            { urls: ["stun:stun2.l.google.com:19302"] },
            { urls: ["stun:stun.cloudflare.com:3478"] }
          ],
          requestedPlan: 'webrtc-gpu-large',
          requestedRegion: 'us',
          realtimeProcessing: true
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
            
            // Check if we have any remote candidates yet
            if (pc.iceConnectionState === 'checking' || pc.iceConnectionState === 'connected') {
              console.log('[WebRTC] ICE candidate gathering/connection in progress...');
            }
            
            if (pc.connectionState === 'connected') {
              setStreaming(true);
              clearInterval(checkConnection);
            }
            
            if (pc.connectionState === 'failed') {
              setStreamingError('WebRTC Connection Failed');
              clearInterval(checkConnection);
            }
          }
        } catch (e) {
          // Ignore errors during poll
        }
      }, 1000);
      
      // Cleanup interval after 10s if not connected
      setTimeout(() => clearInterval(checkConnection), 10000);

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
  }, [isRealTimeEnabled, isPlaying, startStreaming, stopStreaming]);

  return {
    stream: streamRef.current
  };
};

