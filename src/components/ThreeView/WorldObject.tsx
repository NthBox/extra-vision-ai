import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Box, Cylinder } from '@react-three/drei';
import * as THREE from 'three';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Detection, useVisionStore } from '../../store/useVisionStore';

interface WorldObjectProps {
  detection: Detection;
}

export const WorldObject = ({ detection }: WorldObjectProps) => {
  const meshRef = useRef<THREE.Group>(null);
  const { imageDimensions, cameraConfig, threeViewMode } = useVisionStore();
  const { size: screen } = useThree();
  
  const [orientation, setOrientation] = useState<ScreenOrientation.Orientation>(
    ScreenOrientation.Orientation.PORTRAIT_UP
  );

  useEffect(() => {
    let isMounted = true;
    const initOrientation = async () => {
      try {
        const current = await ScreenOrientation.getOrientationAsync();
        if (isMounted) setOrientation(current);
      } catch (e) {
        // Fallback or ignore if module not available
      }
    };
    initOrientation();

    const subscription = ScreenOrientation.addOrientationChangeListener((event) => {
      if (isMounted) setOrientation(event.orientationInfo.orientation);
    });

    return () => {
      isMounted = false;
      ScreenOrientation.removeOrientationChangeListener(subscription);
    };
  }, []);
  
  const { label, bbox } = detection;
  const [x, y, w, h] = bbox;

  const targetPosition = useMemo(() => {
    const INPUT_WIDTH = imageDimensions.width;
    const INPUT_HEIGHT = imageDimensions.height;
    
    // Detect if the sensor matches the UI orientation
    const isUIInPortrait = screen.height > screen.width;
    const isSensorInPortrait = INPUT_HEIGHT > INPUT_WIDTH;
    const needsRotation = isUIInPortrait !== isSensorInPortrait;

    let normX, normY, normW, normH;

    if (needsRotation) {
      // Map sensor-space (Landscape) to UI-space (Portrait)
      // Standard 90deg CCW transform
      normX = y / INPUT_HEIGHT;
      normY = (INPUT_WIDTH - (x + w)) / INPUT_WIDTH;
      normW = h / INPUT_HEIGHT;
      normH = w / INPUT_WIDTH;
    } else {
      // Normal 1:1 mapping
      normX = x / INPUT_WIDTH;
      normY = y / INPUT_HEIGHT;
      normW = w / INPUT_WIDTH;
      normH = h / INPUT_HEIGHT;
    }
    
    if (threeViewMode === 'SIMULATED') {
      // --- Simulated Math Implementation (Tesla/Waymo style) ---
      const MAX_RANGE = 80; // Total visual depth
      const { horizontalOffset } = cameraConfig;
      
      // 1. Relative Depth (Z)
      const yBottom = normY + normH;
      
      // Pull horizon up slightly to give more room for the ground mapping
      const horizon = 0.35; 
      const t = Math.max(0, (yBottom - horizon) / (1.0 - horizon));
      
      // Steep power curve (2.5) pulls objects MUCH closer to the car.
      const distZ = -Math.pow(1 - t, 2.5) * MAX_RANGE;

      // 2. Relative Lateral (X)
      // FIX: Apply horizontal offset to calibrate center alignment
      const xCenter = (normX + normW / 2) + horizontalOffset;
      
      // FIX: Road-Width Compression & Trapezoidal Projection
      // A standard 3-lane road is roughly 12m wide.
      // We make the view narrower at the horizon to match real perspective.
      const viewWidthAtBumper = 14; 
      const viewWidthAtHorizon = 24; 
      const effectiveWidth = viewWidthAtBumper + (1 - t) * (viewWidthAtHorizon - viewWidthAtBumper);
      
      const posX = (xCenter - 0.5) * effectiveWidth;

      return new THREE.Vector3(posX, 0, distZ);
    }

    // --- REAL IPM Math Implementation ---
    const { fov, height: camHeight, pitch, opticalCenter } = cameraConfig;
    const [cx, cy] = opticalCenter;

    // 1. Calculate Focal Length (f) in normalized units
    // f = 0.5 / tan(fov/2)
    const focalLength = 0.5 / Math.tan((fov * Math.PI / 180) / 2);

    // 2. Map pixel y to vertical angle (alpha)
    // The bottom of the box (normY + normH) is used for ground distance
    const yBottom = normY + normH;
    const dy = yBottom - cy;
    const alpha = Math.atan(dy / focalLength);

    // 3. Calculate Depth (Z)
    // Z = height / tan(pitch + alpha)
    // We use Math.abs to ensure positive distance and cap it for stability
    const totalAngle = pitch + alpha;
    let distZ = 0;
    
    if (Math.abs(totalAngle) > 0.01) {
      distZ = -camHeight / Math.tan(totalAngle);
    } else {
      distZ = -50; // Fallback for horizon
    }

    // Clip depth to reasonable range [0, 100]
    distZ = Math.max(-100, Math.min(0, distZ));
    
    // 4. Calculate Lateral (X)
    // X = (x_center - cx) * Z / f
    const xCenter = normX + normW / 2;
    const dx = xCenter - cx;
    const posX = dx * Math.abs(distZ) / focalLength;
    
    return new THREE.Vector3(posX, 0, distZ);
  }, [x, y, w, h, imageDimensions, screen.width, screen.height, cameraConfig]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Smooth interpolation (lerp)
      // Faster lerp for simulated mode for "Tesla" feel
      const lerpFactor = threeViewMode === 'SIMULATED' ? 0.15 : 0.1;
      meshRef.current.position.lerp(targetPosition, lerpFactor);
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
