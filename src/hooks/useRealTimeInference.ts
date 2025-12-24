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
          frameRate: { ideal: 30 }
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
          workspaceName: 'n-a', // Proxy handles this via env
          workflowId: 'n-a',    // Proxy handles this via env
          dataOutputNames: ['predictions'],
          requestedPlan: 'webrtc-gpu-large',
          requestedRegion: 'us',
          realtimeProcessing: true
        },
        onData: (data: any) => {
          let predictions = data.predictions;
          
          if (!predictions && data.outputs?.[0]) {
             const output0 = data.outputs[0];
             predictions = output0.predictions?.predictions || output0.output?.predictions || output0.predictions;
          }

          if (predictions && Array.isArray(predictions)) {
            const mappedDetections: Detection[] = predictions.map((p: any) => ({
              bbox: [p.x, p.y, p.width, p.height],
              label: p.class || p.label,
              score: p.confidence || p.score,
            }));
            setDetections(mappedDetections);
          }
        }
      });

      sessionRef.current = session;
      setStreaming(true);
      console.log('Real-time session established.');
    } catch (err: any) {
      console.error('Failed to start real-time streaming:', err);
      setStreamingError(err.message || 'Failed to start streaming');
      setStreaming(false);
      stopStreaming();
    }
  }, [setDetections, setStreaming, setStreamingError, stopStreaming, setImageDimensions]);

  useEffect(() => {
    if (isRealTimeEnabled) {
      startStreaming();
    } else {
      stopStreaming();
    }

    return () => {
      stopStreaming();
    };
  }, [isRealTimeEnabled, startStreaming, stopStreaming]);

  return {
    stream: streamRef.current
  };
};

