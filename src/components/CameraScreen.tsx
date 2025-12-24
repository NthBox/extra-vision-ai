import React, { useRef, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCameraStore } from '../store/useCameraStore';
import { useVisionStore } from '../store/useVisionStore';
import { useInference } from '../hooks/useInference';
import { HUDOverlay } from './HUDOverlay';

export const CameraScreen = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  
  const { isCameraReady, setIsCameraReady } = useCameraStore();
  const { isInferring, detections, setImageDimensions } = useVisionStore();
  const { mutate: runInference } = useInference();

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  const captureFrame = useCallback(async () => {
    if (cameraRef.current && isCameraReady && !isInferring) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.3, // Lowered quality further to reduce buffer size
          scale: 0.5,
          // Removed skipProcessing: true as it can cause 'Image could not be captured' on some devices
        });

        if (photo?.base64) {
          if (photo.width && photo.height) {
            setImageDimensions(photo.width, photo.height);
          }
          runInference(photo.base64);
        }
      } catch (error: any) {
        // Handle common errors more gracefully
        const msg = error.message || '';
        if (msg.includes('Camera unmounted') || msg.includes('Image could not be captured')) {
          // These are common during startup or if the loop is too fast, ignore for cleaner logs
          return;
        }
        console.error('Inference capture error:', error);
      }
    }
  }, [isCameraReady, isInferring, runInference]);

  // Inference Loop using sequential timeout to prevent overlap
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const loop = async () => {
      if (!isMounted) return;
      
      // Add a small initial delay to ensure hardware is truly ready
      if (isCameraReady && !isInferring) {
        await captureFrame();
      }
      
      // Dynamic delay: longer if it failed, shorter if it's working
      // Target ~5-10 FPS to keep the camera buffer clear
      timeoutId = setTimeout(loop, 150); 
    };

    if (isCameraReady) {
      // Small delay after onCameraReady before starting the loop
      timeoutId = setTimeout(loop, 500);
    }

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isCameraReady, isInferring, captureFrame]);

  if (!permission) {
    return <View style={styles.container}><Text>Requesting permissions...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <TouchableOpacity onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        ref={cameraRef}
        onCameraReady={() => setIsCameraReady(true)}
        responsiveOrientationWhenOrientationLocked
      />
      <HUDOverlay />
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            {isInferring ? 'Detecting...' : `Objects: ${detections.length}`}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    color: '#fff',
  },
  buttonText: {
    color: '#0a7ea4',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusContainer: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
  },
});

