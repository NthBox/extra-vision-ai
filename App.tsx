import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CameraScreen } from './src/components/CameraScreen';
import { StatusBar } from 'expo-status-bar';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CameraScreen />
      <StatusBar style="light" />
    </QueryClientProvider>
  );
}
