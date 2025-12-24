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
          // Request the "predictions" output from the workflow
          // Error message confirms available outputs are: ['predictions', 'visualization']
          dataOutputNames: ["predictions"],
          // We don't need a video stream output from the server
          streamOutputNames: [],
          requestedPlan: 'webrtc-gpu-large',
          requestedRegion: 'us',
          realtimeProcessing: true
        },
        onComplete: () => {
          console.log('[WebRTC] Data channel closed - stream completed');
        },
        onData: (data: any) => {
          // Log errors if present (but don't stop processing - some frames may have errors)
          if (data.errors && data.errors.length > 0) {
            // Only log non-GPU errors (GPU errors are common and non-fatal)
            const nonGpuErrors = data.errors.filter((e: string) => !e.includes('NVML') && !e.includes('PyTorch'));
            if (nonGpuErrors.length > 0) {
              console.warn('[WebRTC] Frame errors:', nonGpuErrors);
            }
          }
          
          let predictions: any[] | null = null;
          
          // Roboflow WebRTC sends data in serialized_output_data when block outputs are requested
          if (data.serialized_output_data !== undefined && data.serialized_output_data !== null) {
            const serialized = data.serialized_output_data;
            
            // Log the actual structure to debug
            console.log('[WebRTC] serialized_output_data:', JSON.stringify(serialized).substring(0, 300));
            
            // The workflow blocks are: "rapid_model" and "visualization"
            // The response outputs are likely: "predictions" and "visualization"
            // Structure: serialized_output_data.rapid_model.predictions (array of detections)
            if (serialized.predictions) {
              if (Array.isArray(serialized.predictions)) {
                predictions = serialized.predictions;
                console.log(`[WebRTC] ✓ Found ${predictions.length} predictions in serialized.predictions`);
              } else if (serialized.predictions.predictions) {
                predictions = serialized.predictions.predictions;
                console.log(`[WebRTC] ✓ Found ${predictions.length} predictions in serialized.predictions.predictions`);
              }
            }

            if (!predictions && serialized.rapid_model) {
              if (Array.isArray(serialized.rapid_model)) {
                // Direct array
                predictions = serialized.rapid_model;
                console.log(`[WebRTC] ✓ Found ${predictions.length} predictions in serialized.rapid_model`);
              } else if (serialized.rapid_model.predictions) {
                // Block output structure: rapid_model.predictions
                if (Array.isArray(serialized.rapid_model.predictions)) {
                  predictions = serialized.rapid_model.predictions;
                  console.log(`[WebRTC] ✓ Found ${predictions.length} predictions in serialized.rapid_model.predictions`);
                } else if (serialized.rapid_model.predictions.predictions) {
                  // Nested: rapid_model.predictions.predictions
                  predictions = serialized.rapid_model.predictions.predictions;
                  console.log(`[WebRTC] ✓ Found ${predictions.length} predictions in serialized.rapid_model.predictions.predictions`);
                }
              }
            }
            
            if (!predictions) {
              console.log('[WebRTC] ✗ No predictions in serialized_output_data. Keys:', Object.keys(serialized));
            }
          } else {
            console.log('[WebRTC] serialized_output_data is null/undefined');
          }
          
          // Fallback to other possible structures if not found yet
          if (!predictions && data.predictions) {
            predictions = Array.isArray(data.predictions) ? data.predictions : null;
            console.log('[WebRTC] Found predictions in data.predictions');
          }
          
          if (!predictions && data.outputs) {
            if (Array.isArray(data.outputs) && data.outputs[0]) {
              const output0 = data.outputs[0];
              predictions = output0.predictions?.predictions || output0.output?.predictions || output0.predictions;
              console.log('[WebRTC] Found predictions in data.outputs[0]');
            } else if (data.outputs.predictions) {
              predictions = data.outputs.predictions;
              console.log('[WebRTC] Found predictions in data.outputs.predictions');
            }
          }
          
          if (!predictions && data.data_output) {
            predictions = data.data_output;
            console.log('[WebRTC] Found predictions in data.data_output');
          }
          
          if (!predictions) {
            console.log('[WebRTC] No predictions found. Top-level keys:', Object.keys(data));
          }

          if (predictions && Array.isArray(predictions)) {
            console.log(`[WebRTC] Processing ${predictions.length} predictions`);
            const mappedDetections: Detection[] = predictions.map((p: any) => {
              // Roboflow WebRTC uses center coordinates: {x, y, width, height}
              // Convert center (x, y) to top-left corner for bbox format [x, y, w, h]
              const centerX = p.x || 0;
              const centerY = p.y || 0;
              const width = p.width || 0;
              const height = p.height || 0;
              
              const bbox: [number, number, number, number] = [
                centerX - width / 2,  // top-left x
                centerY - height / 2, // top-left y
                width,
                height
              ];
              
              // Map class_id to label (class_id 1 is typically "car" in most models)
              const classId = p.class_id;
              const labelMap: Record<number, string> = {
                1: 'car',
                2: 'person',
                3: 'truck',
                4: 'bus',
                5: 'motorcycle',
                6: 'bicycle',
              };
              
              return {
                bbox,
                label: p.class || p.label || p.class_name || labelMap[classId] || `class_${classId}` || 'unknown',
                score: p.confidence || p.score || 0,
              };
            });
            
            console.log(`[WebRTC] Mapped ${mappedDetections.length} detections:`, mappedDetections.map(d => d.label));
            setDetections(mappedDetections);
          } else {
            // No valid predictions array in this frame (could be skipped or error)
            // DO NOT clear detections here. Keeping the last valid detections on screen
            // provides a smoother experience when inference is slower than frame rate.
            if (data.serialized_output_data === null) {
              console.log('[WebRTC] Frame skipped (no output data)');
            }
          }
        },
        options: {
          disableInputStreamDownscaling: false
        }
      });

      sessionRef.current = session;
      
      // Check connection state after a delay
      setTimeout(async () => {
        try {
          // Access the internal peer connection to check connection state
          const pc = (session as any).pc;
          if (pc) {
            console.log('[WebRTC] Peer connection state:', pc.connectionState);
            console.log('[WebRTC] ICE connection state:', pc.iceConnectionState);
          }
        } catch (e) {
          console.log('[WebRTC] Could not access peer connection:', e);
        }
        
        setStreaming(true);
        console.log('Real-time session established.');
      }, 2000);
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

