import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { GroundPlane } from './GroundPlane';
import { EgoVehicle } from './EgoVehicle';
import { DetectionRenderer } from './DetectionRenderer';

export const ThreeViewContainer = () => {
  return (
    <View style={styles.container}>
      <Canvas shadows>
        <PerspectiveCamera 
          makeDefault 
          position={[0, 4, 8]} 
          fov={60} 
          rotation={[-0.4, 0, 0]} 
        />
        
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} castShadow />
        <directionalLight 
          position={[-5, 10, 5]} 
          intensity={0.8} 
          castShadow 
          shadow-camera-far={50}
        />
        
        <GroundPlane />
        <EgoVehicle />
        
        <DetectionRenderer />
        
        <fog attach="fog" args={['#050505', 10, 50]} />
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
