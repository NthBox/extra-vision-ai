import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Cylinder } from '@react-three/drei';
import * as THREE from 'three';
import { Detection, useVisionStore } from '../../store/useVisionStore';

interface WorldObjectProps {
  detection: Detection;
}

export const WorldObject = ({ detection }: WorldObjectProps) => {
  const meshRef = useRef<THREE.Group>(null);
  const { imageDimensions } = useVisionStore();
  
  const { label, bbox } = detection;
  const [x, y, w, h] = bbox;
  
  // Projection Constants
  const DEPTH_SCALE = 40; // Max distance in meters
  const LATERAL_SCALE = 1.5; // Correction for FOV

  const targetPosition = useMemo(() => {
    const imgWidth = imageDimensions.width;
    const imgHeight = imageDimensions.height;
    
    // Depth (Z): Closer to bottom (y+h high) means closer to car (Z=0)
    // We use a quadratic scale for better perspective feel
    const bottomYNormalized = (y + h) / imgHeight;
    const distZ = -Math.pow(1 - bottomYNormalized, 1.5) * DEPTH_SCALE;
    
    // Lateral (X): Horizontal center
    const centerXNormalized = (x + w / 2) / imgWidth;
    const posX = (centerXNormalized - 0.5) * Math.abs(distZ) * LATERAL_SCALE;
    
    return new THREE.Vector3(posX, 0, distZ);
  }, [x, y, w, h, imageDimensions]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Smooth interpolation (lerp)
      meshRef.current.position.lerp(targetPosition, 0.1);
    }
  });

  const visualParams = useMemo(() => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('person') || lowerLabel.includes('pedestrian')) {
      return {
        type: 'person',
        color: '#FFCC00',
        args: [0.4, 0.4, 1.8, 16] as const, // radiusTop, radiusBottom, height, segments
      };
    }
    if (lowerLabel.includes('truck') || lowerLabel.includes('bus')) {
      return {
        type: 'truck',
        color: '#4A90E2',
        args: [2.5, 3, 8] as const, // width, height, depth
      };
    }
    // Default to car
    return {
      type: 'car',
      color: '#007AFF',
      args: [2, 1.2, 4.5] as const, // width, height, depth
    };
  }, [label]);

  return (
    <group ref={meshRef}>
      {visualParams.type === 'person' ? (
        <Cylinder args={visualParams.args} position={[0, 0.9, 0]}>
          <meshStandardMaterial color={visualParams.color} />
        </Cylinder>
      ) : (
        <Box args={visualParams.args} position={[0, visualParams.args[1] / 2, 0]}>
          <meshStandardMaterial color={visualParams.color} />
        </Box>
      )}
    </group>
  );
};
