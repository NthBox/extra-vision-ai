import React from 'react';
import { Box } from '@react-three/drei';
import { useVisionStore } from '../../store/useVisionStore';

export const EgoVehicle = () => {
  const { threeViewMode } = useVisionStore();
  
  return (
    <group position={[0, 0, 0]}>
      {/* Stylized car body */}
      <Box args={[1.8, 0.8, 4]} position={[0, 0.4, 0]}>
        <meshStandardMaterial 
          color={threeViewMode === 'SIMULATED' ? "#444444" : "#ffffff"} 
          metalness={0.8} 
          roughness={0.2} 
        />
      </Box>
      {/* Car cabin */}
      <Box args={[1.6, 0.5, 2]} position={[0, 0.9, -0.2]}>
        <meshStandardMaterial 
          color={threeViewMode === 'SIMULATED' ? "#888888" : "#222222"} 
          opacity={0.6} 
          transparent 
        />
      </Box>
    </group>
  );
};
