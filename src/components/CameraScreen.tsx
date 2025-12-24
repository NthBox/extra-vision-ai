import React, { useRef, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Switch } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { RTCView } from 'react-native-webrtc';
import { useCameraStore } from '../store/useCameraStore';
import { useVisionStore } from '../store/useVisionStore';
import { useInference } from '../hooks/useInference';
import { useRealTimeInference } from '../hooks/useRealTimeInference';
import { HUDOverlay } from './HUDOverlay';

export const CameraScreen = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  
  const { isCameraReady, setIsCameraReady } = useCameraStore();
  const { 
    isInferring, 
    detections, 
    setImageDimensions,
    isRealTimeEnabled,
    setRealTimeEnabled,
    isStreaming
  } = useVisionStore();
  
  const { mutate: runInference } = useInference();
  const { stream } = useRealTimeInference();

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  const captureFrame = useCallback(async () => {
    if (cameraRef.current && isCameraReady && !isInferring && !isRealTimeEnabled) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.3,
          scale: 0.5,
        });

        if (photo?.base64) {
          if (photo.width && photo.height) {
            setImageDimensions(photo.width, photo.height);
          }
          runInference(photo.base64);
        }
      } catch (error: any) {
        const msg = error.message || '';
        if (msg.includes('Camera unmounted') || msg.includes('Image could not be captured')) {
          return;
        }
        console.error('Inference capture error:', error);
      }
    }
  }, [isCameraReady, isInferring, runInference, isRealTimeEnabled, setImageDimensions]);

  // Inference Loop for manual mode
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const loop = async () => {
      if (!isMounted || isRealTimeEnabled) return;
      
      if (isCameraReady && !isInferring) {
        await captureFrame();
      }
      
      timeoutId = setTimeout(loop, 150); 
    };

    if (isCameraReady && !isRealTimeEnabled) {
      timeoutId = setTimeout(loop, 500);
    }

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isCameraReady, isInferring, captureFrame, isRealTimeEnabled]);

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
      {isRealTimeEnabled && stream ? (
        <RTCView
          streamURL={stream.toURL()}
          style={styles.camera}
          objectFit="cover"
        />
      ) : (
        <CameraView
          style={styles.camera}
          ref={cameraRef}
          onCameraReady={() => setIsCameraReady(true)}
          responsiveOrientationWhenOrientationLocked
        />
      )}
      
      <HUDOverlay />
      
      <View style={styles.overlay}>
        <View style={styles.controlsContainer}>
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Real-time</Text>
            <Switch
              value={isRealTimeEnabled}
              onValueChange={setRealTimeEnabled}
              trackColor={{ false: "#767577", true: "#0a7ea4" }}
              thumbColor={isRealTimeEnabled ? "#fff" : "#f4f3f4"}
            />
          </View>
          
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              {isRealTimeEnabled 
                ? (isStreaming ? 'LIVE' : 'Connecting...') 
                : (isInferring ? 'Detecting...' : `Objects: ${detections.length}`)}
            </Text>
          </View>
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
  controlsContainer: {
    alignItems: 'center',
    gap: 10,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 25,
    gap: 10,
  },
  toggleLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
