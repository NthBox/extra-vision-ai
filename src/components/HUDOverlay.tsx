import React from 'react';
import { StyleSheet, View, useWindowDimensions, Text } from 'react-native';
import Svg, { Rect, Text as SvgText, G } from 'react-native-svg';
import { useVisionStore } from '../store/useVisionStore';

export const HUDOverlay = () => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { detections, imageDimensions } = useVisionStore();

  const INPUT_WIDTH = imageDimensions.width;
  const INPUT_HEIGHT = imageDimensions.height;

  // Detect if the sensor matches the UI orientation
  const isUIInPortrait = screenHeight > screenWidth;
  const isSensorInPortrait = INPUT_HEIGHT > INPUT_WIDTH;

  // If UI is Portrait but Sensor is Landscape (or vice versa), we need to rotate
  const needsRotation = isUIInPortrait !== isSensorInPortrait;

  // Use effective dimensions for scaling
  const effectiveWidth = needsRotation ? INPUT_HEIGHT : INPUT_WIDTH;
  const effectiveHeight = needsRotation ? INPUT_WIDTH : INPUT_HEIGHT;

  const screenAspectRatio = screenWidth / screenHeight;
  const imageAspectRatio = effectiveWidth / effectiveHeight;

  let scale, offsetX = 0, offsetY = 0;

  if (imageAspectRatio > screenAspectRatio) {
    scale = screenHeight / effectiveHeight;
    offsetX = (effectiveWidth * scale - screenWidth) / 2;
  } else {
    scale = screenWidth / effectiveWidth;
    offsetY = (effectiveHeight * scale - screenHeight) / 2;
  }

  // Zone of Interest (ZOI)
  const zoiWidth = screenWidth * 0.6;
  const zoiHeight = screenHeight * 0.8;
  const zoiX = (screenWidth - zoiWidth) / 2;
  const zoiY = (screenHeight - zoiHeight) / 2;

  const getBoxColor = (label: string, rectX: number, rectY: number, rectW: number, rectH: number) => {
    const isPriorityObject = ['person', 'cyclist', 'emergency_vehicle', 'pedestrian'].includes(label.toLowerCase());
    const inZOI = (
      rectX < zoiX + zoiWidth &&
      rectX + rectW > zoiX &&
      rectY < zoiY + zoiHeight &&
      rectY + rectH > zoiY
    );

    if (isPriorityObject && inZOI) return '#FF3B30';
    if (inZOI) return '#FFCC00';
    return '#4CD964';
  };

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      <Svg height="100%" width="100%" viewBox={`0 0 ${screenWidth} ${screenHeight}`}>
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
          
          let rectX, rectY, rectW, rectH;

          if (needsRotation) {
            // PORTRAIT MODE (Sensor is sideways)
            // Map Sensor Y to Screen X, Sensor X to Screen Y (inverted)
            const mappedX = y;
            const mappedY = INPUT_WIDTH - x;
            rectW = h * scale;
            rectH = w * scale;
            rectX = mappedX * scale - rectW / 2 - offsetX;
            rectY = mappedY * scale - rectH / 2 - offsetY;
          } else {
            // LANDSCAPE MODE (Sensor matches UI)
            rectW = w * scale;
            rectH = h * scale;
            rectX = x * scale - rectW / 2 - offsetX;
            rectY = y * scale - rectH / 2 - offsetY;
          }

          const color = getBoxColor(detection.label, rectX, rectY, rectW, rectH);
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
                strokeOpacity={isUrgent ? 1 : 0.7}
                fill={isUrgent ? color : 'transparent'}
                fillOpacity={isUrgent ? 0.1 : 0}
              />
              <SvgText
                x={rectX}
                y={rectY - 5}
                fill={color}
                stroke="black"
                strokeWidth="0.3"
                fontSize={isUrgent ? '14' : '12'}
                fontWeight="bold"
                // Rotate text 90deg only in Portrait mode where the sensor is rotated
                transform={needsRotation ? `rotate(90, ${rectX}, ${rectY - 5})` : undefined}
              >
                {`${detection.label.toUpperCase()}${isUrgent ? ' !' : ''}`}
              </SvgText>
            </G>
          );
        })}
      </Svg>
      
      <View style={styles.debugContainer}>
        <Text style={styles.debugText}>
          Img: {INPUT_WIDTH}x{INPUT_HEIGHT} | Scr: {Math.round(screenWidth)}x{Math.round(screenHeight)} {needsRotation ? '(R)' : ''}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  debugContainer: {
    position: 'absolute',
    top: 40,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 4,
    borderRadius: 4,
  },
  debugText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'monospace',
  },
});


