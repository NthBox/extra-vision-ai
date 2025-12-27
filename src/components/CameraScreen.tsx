import React, { useRef, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Switch } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { RTCView } from 'react-native-webrtc';
import { useCameraStore } from '../store/useCameraStore';
import { useVisionStore } from '../store/useVisionStore';
import { useInference } from '../hooks/useInference';
import { useRealTimeInference } from '../hooks/useRealTimeInference';
import { HUDOverlay } from './HUDOverlay';
import { ThreeViewContainer } from './ThreeView';

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
    isStreaming,
    isPlaying,
    setIsPlaying,
    visualizationMode,
    setVisualizationMode
  } = useVisionStore();
  
  const { mutate: runInference } = useInference();
  const { stream } = useRealTimeInference();

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  const captureFrame = useCallback(async () => {
    if (cameraRef.current && isCameraReady && !isInferring && !isRealTimeEnabled && isPlaying) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.2,
          scale: 0.25,
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
  }, [isCameraReady, isInferring, runInference, isRealTimeEnabled, isPlaying, setImageDimensions]);

  // Inference Loop for manual mode
  useEffect(() => {
    let isMounted = true;
    let timeoutId: any;

    const loop = async () => {
      if (!isMounted || isRealTimeEnabled || !isPlaying) return;
      
      if (isCameraReady && !isInferring) {
        await captureFrame();
      }
      
      // Aim for ~40ms cadence per frame (quarter of 150ms)
      timeoutId = setTimeout(loop, 40); 
    };

    if (isCameraReady && !isRealTimeEnabled && isPlaying) {
      // Start immediately with a short delay to bootstrap cadence
      timeoutId = setTimeout(loop, 40);
    }

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isCameraReady, isInferring, captureFrame, isRealTimeEnabled, isPlaying]);

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
      <View style={styles.cameraContainer}>
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
      </View>

      {visualizationMode === '3D' && (
        <View style={styles.threeOverlay}>
          <ThreeViewContainer />
        </View>
      )}
      
      <HUDOverlay />
      
      <View style={styles.overlay}>
        <View style={styles.controlsContainer}>
          <View style={styles.modeToggleContainer}>
            <View style={[styles.toggleContainer, { backgroundColor: 'rgba(255,152,0,0.3)' }]}>
              <Text style={[styles.toggleLabel, { color: '#ff9800' }]}>3D View</Text>
              <Switch
                value={visualizationMode === '3D'}
                onValueChange={(val) => {
                  console.log('Changing visualization mode to:', val ? '3D' : 'CAMERA');
                  setVisualizationMode(val ? '3D' : 'CAMERA');
                }}
                trackColor={{ false: "#767577", true: "#ff9800" }}
                thumbColor={visualizationMode === '3D' ? "#fff" : "#f4f3f4"}
              />
            </View>
          </View>

          <View style={styles.topControls}>
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleLabel}>Real-time</Text>
              <Switch
                value={isRealTimeEnabled}
                onValueChange={setRealTimeEnabled}
                trackColor={{ false: "#767577", true: "#0a7ea4" }}
                thumbColor={isRealTimeEnabled ? "#fff" : "#f4f3f4"}
              />
            </View>

            <TouchableOpacity 
              style={[styles.playButton, isPlaying ? styles.pauseButton : styles.startButton]} 
              onPress={() => setIsPlaying(!isPlaying)}
            >
              <Text style={styles.playButtonText}>{isPlaying ? 'PAUSE' : 'PLAY'}</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              {!isPlaying 
                ? 'PAUSED'
                : (isRealTimeEnabled 
                  ? (isStreaming ? `LIVE | Objects: ${detections.length}` : 'Connecting...') 
                  : (isInferring ? 'Detecting...' : `Objects: ${detections.length}`))}
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
  cameraContainer: {
    flex: 1,
  },
  threeOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
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
    zIndex: 10,
  },
  controlsContainer: {
    alignItems: 'center',
    gap: 10,
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modeToggleContainer: {
    marginBottom: 5,
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
  playButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  pauseButton: {
    backgroundColor: '#f44336',
  },
  playButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
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
