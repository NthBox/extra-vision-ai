import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { useVisionStore } from '../../store/useVisionStore';
import { GroundPlane } from './GroundPlane';
import { EgoVehicle } from './EgoVehicle';
import { DetectionRenderer } from './DetectionRenderer';

export const ThreeViewContainer = () => {
  const { cameraConfig, threeViewMode, simulatedViewZoom } = useVisionStore();
  
  // Camera settings based on mode
  let cameraPos: [number, number, number];
  let cameraRot: [number, number, number];
  let cameraFov: number;

  if (threeViewMode === 'SIMULATED') {
    if (simulatedViewZoom === 'ZOOMED') {
      // Zoomed actionable view: Closer Z, narrower FOV
      // We keep height at 10m as requested
      cameraPos = [0, 10, 8]; 
      cameraRot = [-0.5, 0, 0]; // Steeper tilt to keep car anchored at bottom edge
      cameraFov = 50;
    } else {
      // Standard overview
      cameraPos = [0, 10, 15];
      cameraRot = [-0.3, 0, 0];
      cameraFov = 70;
    }
  } else {
    // Physical mounting position for real view
    cameraPos = [0, cameraConfig.height, 0];
    cameraRot = [cameraConfig.pitch, 0, 0];
    cameraFov = cameraConfig.fov;
  }

  return (
    <View style={styles.container}>
      <Canvas shadows>
        <PerspectiveCamera 
          makeDefault 
          position={cameraPos} 
          fov={cameraFov} 
          rotation={cameraRot} 
        />
        
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} castShadow />
        <directionalLight 
          position={[-5, 10, 5]} 
          intensity={0.8} 
          castShadow 
          shadow-camera-far={100}
        />
        
        <GroundPlane />
        <EgoVehicle />
        
        <DetectionRenderer />
        
        <fog attach="fog" args={['#050505', 20, 150]} />
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
});
