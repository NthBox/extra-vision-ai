import React from 'react';
import { useVisionStore } from '../../store/useVisionStore';
import { WorldObject } from './WorldObject';

export const DetectionRenderer = () => {
  const detections = useVisionStore((state) => state.detections);

  return (
    <group>
      {detections.map((detection, index) => (
        <WorldObject 
          key={`${detection.label}-${index}`} 
          detection={detection} 
        />
      ))}
    </group>
  );
};
