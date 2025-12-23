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
  setDetections: (detections: Detection[]) => void;
  setInferring: (isInferring: boolean) => void;
  updateInferenceTime: () => void;
}

export const useVisionStore = create<VisionState>((set) => ({
  detections: [],
  isInferring: false,
  lastInferenceTime: 0,
  setDetections: (detections) => set({ detections }),
  setInferring: (isInferring) => set({ isInferring }),
  updateInferenceTime: () => set({ lastInferenceTime: Date.now() }),
}));

