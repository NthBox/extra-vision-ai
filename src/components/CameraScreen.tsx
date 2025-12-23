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
  const { isInferring, detections } = useVisionStore();
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
          quality: 0.5, // Reduced quality for faster transfer
          scale: 0.5,   // Reduced scale
          skipProcessing: true,
        });

        if (photo?.base64) {
          runInference(photo.base64);
        }
      } catch (error) {
        console.error('Failed to capture frame:', error);
      }
    }
  }, [isCameraReady, isInferring, runInference]);

  // Inference Loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCameraReady) {
      interval = setInterval(() => {
        captureFrame();
      }, 100); // Target ~10 FPS
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCameraReady, captureFrame]);

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
      >
        <HUDOverlay />
        <View style={styles.overlay}>
          {/* HUD Overlay will be placed here */}
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              {isInferring ? 'Detecting...' : `Objects: ${detections.length}`}
            </Text>
          </View>
        </View>
      </CameraView>
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
    flex: 1,
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

