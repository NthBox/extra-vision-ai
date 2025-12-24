import { create } from 'zustand';

export interface Detection {
  bbox: [number, number, number, number]; // [x, y, w, h]
  label: string;
  score: number;
}

interface VisionState {
  detections: Detection[];
  isInferring: boolean;
  lastInferenceTime: number;
  imageDimensions: { width: number; height: number };
  setDetections: (detections: Detection[]) => void;
  setInferring: (isInferring: boolean) => void;
  setImageDimensions: (width: number, height: number) => void;
  updateInferenceTime: () => void;
}

export const useVisionStore = create<VisionState>((set) => ({
  detections: [],
  isInferring: false,
  lastInferenceTime: 0,
  imageDimensions: { width: 640, height: 480 },
  setDetections: (detections) => set({ detections }),
  setInferring: (isInferring) => set({ isInferring }),
  setImageDimensions: (width, height) => set({ imageDimensions: { width, height } }),
  updateInferenceTime: () => set({ lastInferenceTime: Date.now() }),
}));

