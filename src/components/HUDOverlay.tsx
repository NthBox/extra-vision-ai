import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Rect, Text as SvgText, G, Line } from 'react-native-svg';
import { useVisionStore } from '../store/useVisionStore';

// Input resolution from Roboflow workflow
const INPUT_WIDTH = 640;
const INPUT_HEIGHT = 480;

export const HUDOverlay = () => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { detections } = useVisionStore();

  // Zone of Interest (ZOI) - center 60% width, 80% height
  const zoiWidth = screenWidth * 0.6;
  const zoiHeight = screenHeight * 0.8;
  const zoiX = (screenWidth - zoiWidth) / 2;
  const zoiY = (screenHeight - zoiHeight) / 2;

  // Calculate scaling factors
  const scaleX = screenWidth / INPUT_WIDTH;
  const scaleY = screenHeight / INPUT_HEIGHT;

  // Function to determine if a detection is in the Zone of Interest
  const isInZOI = (x: number, y: number, w: number, h: number) => {
    const rectX = (x - w / 2) * scaleX;
    const rectY = (y - h / 2) * scaleY;
    const rectW = w * scaleX;
    const rectH = h * scaleY;

    return (
      rectX < zoiX + zoiWidth &&
      rectX + rectW > zoiX &&
      rectY < zoiY + zoiHeight &&
      rectY + rectH > zoiY
    );
  };

  // Function to determine box color based on label and ZOI
  const getBoxColor = (label: string, x: number, y: number, w: number, h: number) => {
    const isPriorityObject = ['person', 'cyclist', 'emergency_vehicle', 'pedestrian'].includes(label.toLowerCase());
    const inZOI = isInZOI(x, y, w, h);

    if (isPriorityObject && inZOI) return '#FF3B30'; // Urgent Red
    if (inZOI) return '#FFCC00'; // Warning Yellow
    return '#4CD964'; // Safe Green
  };

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      <Svg height="100%" width="100%" viewBox={`0 0 ${screenWidth} ${screenHeight}`}>
        {/* Draw Zone of Interest bounds (optional/subtle) */}
        <Rect
          x={zoiX}
          y={zoiY}
          width={zoiWidth}
          height={zoiHeight}
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="1"
          strokeDasharray="5, 5"
          fill="transparent"
        />

        {detections.map((detection, index) => {
          const [x, y, w, h] = detection.bbox;
          
          const rectX = (x - w / 2) * scaleX;
          const rectY = (y - h / 2) * scaleY;
          const rectW = w * scaleX;
          const rectH = h * scaleY;

          const color = getBoxColor(detection.label, x, y, w, h);
          const isUrgent = color === '#FF3B30';

          return (
            <G key={`detection-${index}`}>
              <Rect
                x={rectX}
                y={rectY}
                width={rectW}
                height={rectH}
                stroke={color}
                strokeWidth={isUrgent ? '4' : '2'}
                fill="transparent"
              />
              <SvgText
                x={rectX}
                y={rectY - 5}
                fill={color}
                fontSize={isUrgent ? '14' : '12'}
                fontWeight="bold"
              >
                {`${detection.label.toUpperCase()}${isUrgent ? ' !' : ''}`}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
};

