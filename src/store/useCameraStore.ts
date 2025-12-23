import { create } from 'zustand';

interface CameraState {
  hasPermission: boolean | null;
  isCameraReady: boolean;
  resolution: '480p' | '720p' | '1080p';
  setHasPermission: (hasPermission: boolean | null) => void;
  setIsCameraReady: (isCameraReady: boolean) => void;
  setResolution: (resolution: '480p' | '720p' | '1080p') => void;
}

export const useCameraStore = create<CameraState>((set) => ({
  hasPermission: null,
  isCameraReady: false,
  resolution: '480p',
  setHasPermission: (hasPermission) => set({ hasPermission }),
  setIsCameraReady: (isCameraReady) => set({ isCameraReady }),
  setResolution: (resolution) => set({ resolution }),
}));

