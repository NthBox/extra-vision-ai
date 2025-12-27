import React from 'react';
import { Grid } from '@react-three/drei';
import { useVisionStore } from '../../store/useVisionStore';

export const GroundPlane = () => {
  const { threeViewMode } = useVisionStore();
  
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color={threeViewMode === 'SIMULATED' ? "#0a0a0a" : "#050505"} />
      </mesh>
      <Grid
        infiniteGrid
        fadeDistance={150}
        fadeStrength={5}
        cellSize={threeViewMode === 'SIMULATED' ? 2 : 1}
        sectionSize={threeViewMode === 'SIMULATED' ? 10 : 5}
        sectionThickness={1.5}
        sectionColor={threeViewMode === 'SIMULATED' ? "#444444" : "#333333"}
        cellColor={threeViewMode === 'SIMULATED' ? "#222222" : "#222222"}
      />
    </group>
  );
};
