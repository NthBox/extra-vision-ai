import React from 'react';
import { Grid } from '@react-three/drei';

export const GroundPlane = () => {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#050505" />
      </mesh>
      <Grid
        infiniteGrid
        fadeDistance={50}
        fadeStrength={5}
        cellSize={1}
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#333333"
        cellColor="#222222"
      />
    </group>
  );
};
