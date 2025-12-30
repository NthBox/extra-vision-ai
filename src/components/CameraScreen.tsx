import React, { useRef, useEffect, useCallback, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Switch } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { RTCView } from 'react-native-webrtc';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { useCameraStore } from '../store/useCameraStore';
import { useVisionStore } from '../store/useVisionStore';
import { useInference } from '../hooks/useInference';
import { useRealTimeInference } from '../hooks/useRealTimeInference';
import { useUnifiedInference } from '../hooks/useUnifiedInference';
import { HUDOverlay } from './HUDOverlay';
import { ThreeViewContainer } from './ThreeView';

export const CameraScreen = () => {
  const { hasPermission, requestPermission } = useCameraPermission();
  const visionCameraRef = useRef<Camera>(null);
  
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
    setVisualizationMode,
    threeViewMode,
    setThreeViewMode,
    modelMode,
    setModelMode,
    isEnhancedMode,
    setEnhancedMode,
    isLocalMode,
    setLocalMode,
    cameraConfig,
    updateCameraConfig
  } = useVisionStore();
  
  const { mutate: runInference } = useInference();
  const { stream } = useRealTimeInference();
  const { frameProcessor } = useUnifiedInference();

  const device = useCameraDevice('back');

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  const captureFrame = useCallback(async () => {
    if (visionCameraRef.current && isCameraReady && !isInferring && !isRealTimeEnabled && isPlaying && !isLocalMode) {
      try {
        // Take photo using VisionCamera
        const photo = await visionCameraRef.current.takePhoto({
          flash: 'off',
          enableAutoRedEyeReduction: false,
          enableAutoStabilization: false,
        });

        if (photo?.path) {
          // Update dimensions
          setImageDimensions(photo.width, photo.height);
          
          // Read as base64 for server inference
          const base64 = await FileSystem.readAsStringAsync(`file://${photo.path}`, {
            encoding: 'base64',
          });
          
          runInference(base64);
          
          // Clean up the temp file
          try {
            await FileSystem.deleteAsync(`file://${photo.path}`, { idempotent: true });
          } catch (e) {
            // Ignore cleanup errors
          }
        }
      } catch (error: any) {
        console.error('Inference capture error:', error);
      }
    }
  }, [isCameraReady, isInferring, runInference, isRealTimeEnabled, isPlaying, isLocalMode, setImageDimensions]);

  // Inference Loop for manual mode
  useEffect(() => {
    let isMounted = true;
    let timeoutId: any;

    const loop = async () => {
      if (!isMounted || isRealTimeEnabled || !isPlaying || isLocalMode) return;
      
      if (isCameraReady && !isInferring) {
        await captureFrame();
      }
      
      // Cadence for manual mode (Server-side)
      // Higher latency means we don't need to fire as often as local mode
      timeoutId = setTimeout(loop, 200); 
    };

    if (isCameraReady && !isRealTimeEnabled && isPlaying && !isLocalMode) {
      timeoutId = setTimeout(loop, 200);
    }

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isCameraReady, isInferring, captureFrame, isRealTimeEnabled, isPlaying, isLocalMode]);

  if (!hasPermission) {
    return <View style={styles.container}><Text>Requesting permissions...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        {isRealTimeEnabled ? (
          stream ? (
            <RTCView
              streamURL={stream.toURL()}
              style={styles.camera}
              objectFit="cover"
            />
          ) : (
            <View style={[styles.camera, styles.initializingContainer]}>
              <Text style={styles.initializingText}>INITIALIZING LIVE STREAM...</Text>
              {isStreaming && <Text style={styles.subText}>CONNECTING TO ROBOFLOW...</Text>}
            </View>
          )
        ) : (
          device && (
            <Camera
              ref={visionCameraRef}
              style={styles.camera}
              device={device}
              isActive={isPlaying}
              frameProcessor={frameProcessor}
              pixelFormat="yuv"
              photo={true}
              onInitialized={() => setIsCameraReady(true)}
              onError={(e) => console.error('[EVAI] Camera Error:', e)}
            />
          )
        )}
      </View>

      {visualizationMode === '3D' && (
        <View style={styles.threeOverlay}>
          <ThreeViewContainer />
        </View>
      )}
      
      <HUDOverlay />
      
      <View style={styles.overlay}>
        <View style={styles.bottomControlsBar}>
          <View style={styles.controlGroup}>
            <TouchableOpacity 
              style={[styles.iconButton, visualizationMode === '3D' && styles.activeIconButton]} 
              onPress={() => setVisualizationMode(visualizationMode === '3D' ? 'CAMERA' : '3D')}
            >
              <Text style={styles.iconButtonText}>3D</Text>
            </TouchableOpacity>

            {visualizationMode === '3D' && (
              <>
                <TouchableOpacity 
                  style={[styles.iconButton, threeViewMode === 'REAL' && styles.activeIconButton]} 
                  onPress={() => setThreeViewMode(threeViewMode === 'REAL' ? 'SIMULATED' : 'REAL')}
                >
                  <Text style={styles.iconButtonText}>{threeViewMode === 'REAL' ? 'RL' : 'SIM'}</Text>
                </TouchableOpacity>

                {/* Calibration Nudge Buttons */}
                <TouchableOpacity 
                  style={styles.iconButton} 
                  onPress={() => updateCameraConfig({ horizontalOffset: cameraConfig.horizontalOffset - 0.01 })}
                >
                  <Text style={styles.iconButtonText}>L</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.iconButton} 
                  onPress={() => updateCameraConfig({ horizontalOffset: cameraConfig.horizontalOffset + 0.01 })}
                >
                  <Text style={styles.iconButtonText}>R</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.mainControls}>
            <TouchableOpacity 
              style={[styles.playButton, isPlaying ? styles.pauseButton : styles.startButton]} 
              onPress={() => {
                console.log('[EVAI] PLAY/PAUSE toggled. New state:', !isPlaying);
                setIsPlaying(!isPlaying);
              }}
            >
              <Text style={styles.playButtonText}>{isPlaying ? 'PAUSE' : 'PLAY'}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.iconButton, isRealTimeEnabled && styles.activeIconButton]} 
              onPress={() => setRealTimeEnabled(!isRealTimeEnabled)}
            >
              <Text style={styles.iconButtonText}>LIVE</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.iconButton, isLocalMode && styles.activeLocalButton]} 
              onPress={() => {
                console.log('[EVAI] LOC toggled. New state:', !isLocalMode);
                setLocalMode(!isLocalMode);
              }}
            >
              <Text style={styles.iconButtonText}>LOC</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.iconButton, isEnhancedMode && styles.activeEnhancedButton]} 
              onPress={() => setEnhancedMode(!isEnhancedMode)}
            >
              <Text style={styles.iconButtonText}>ENH</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.iconButton, modelMode === 'ACCURATE' && styles.activeIconButton]} 
              onPress={() => setModelMode(modelMode === 'FAST' ? 'ACCURATE' : 'FAST')}
            >
              <Text style={styles.iconButtonText}>{modelMode === 'FAST' ? 'YOLO' : 'SAM3'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {detections.length} OBJ {visualizationMode === '3D' ? `| CAL: ${(cameraConfig.horizontalOffset * 100).toFixed(0)}` : ''}
            </Text>
          </View>
        </View>

        {visualizationMode === '3D' && threeViewMode === 'REAL' && (
          <View style={styles.presetOverlay}>
            <TouchableOpacity onPress={() => useVisionStore.getState().setCameraPreset('ULTRA_WIDE')} style={styles.presetBadge}>
              <Text style={styles.presetText}>UW</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => useVisionStore.getState().setCameraPreset('WIDE')} style={styles.presetBadge}>
              <Text style={styles.presetText}>W</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => useVisionStore.getState().setCameraPreset('TELE')} style={styles.presetBadge}>
              <Text style={styles.presetText}>T</Text>
            </TouchableOpacity>
          </View>
        )}
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
  initializingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  initializingText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  subText: {
    color: '#4CAF50',
    fontSize: 10,
    marginTop: 8,
    fontWeight: 'bold',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
    paddingBottom: 30,
    zIndex: 10,
  },
  bottomControlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.75)',
    marginHorizontal: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  controlGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  mainControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconButton: {
    backgroundColor: '#007AFF',
  },
  activeLocalButton: {
    backgroundColor: '#4CAF50',
  },
  activeEnhancedButton: {
    backgroundColor: '#FFCC00',
  },
  iconButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  playButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  pauseButton: {
    backgroundColor: '#f44336',
  },
  playButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    color: '#aaa',
    fontSize: 10,
    fontWeight: 'bold',
  },
  presetOverlay: {
    position: 'absolute',
    top: 50,
    right: 20,
    gap: 8,
  },
  presetBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  presetText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
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
});
