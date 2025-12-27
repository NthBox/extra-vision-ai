import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { useVisionStore } from '../../store/useVisionStore';
import { GroundPlane } from './GroundPlane';
import { EgoVehicle } from './EgoVehicle';
import { DetectionRenderer } from './DetectionRenderer';

export const ThreeViewContainer = () => {
  const { cameraConfig, threeViewMode } = useVisionStore();
  
  // Camera settings based on mode
  const cameraPos: [number, number, number] = threeViewMode === 'SIMULATED' 
    ? [0, 5, 8] // Close chase cam (roughly one car length behind ego)
    : [0, cameraConfig.height, 0]; 
    
  const cameraRot: [number, number, number] = threeViewMode === 'SIMULATED'
    ? [-0.4, 0, 0] // Tilted to keep ego car at bottom and horizon in view
    : [cameraConfig.pitch, 0, 0]; 

  const cameraFov = threeViewMode === 'SIMULATED' ? 75 : cameraConfig.fov;

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
