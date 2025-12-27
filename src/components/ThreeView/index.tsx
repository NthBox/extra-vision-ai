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
    ? [0, 8, 12] // Closer and lower chase cam for more intimacy
    : [0, cameraConfig.height, 0]; 
    
  const cameraRot: [number, number, number] = threeViewMode === 'SIMULATED'
    ? [-0.45, 0, 0] // Slightly steeper tilt to keep the ground dominant
    : [cameraConfig.pitch, 0, 0]; 

  const cameraFov = threeViewMode === 'SIMULATED' ? 65 : cameraConfig.fov;

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
