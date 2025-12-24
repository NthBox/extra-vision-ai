import React, { useState, useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions, Text } from 'react-native';
import Svg, { Rect, Text as SvgText, G } from 'react-native-svg';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useVisionStore } from '../store/useVisionStore';

export const HUDOverlay = () => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { detections, imageDimensions } = useVisionStore();
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
        console.warn('ScreenOrientation module not found, falling back to aspect ratio logic.');
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

  const INPUT_WIDTH = imageDimensions.width;
  const INPUT_HEIGHT = imageDimensions.height;

  // PRO LOGIC: Determine if we need to rotate based on actual hardware orientation
  // Sensor is typically landscape (W > H)
  const isPortraitMode = 
    orientation === ScreenOrientation.Orientation.PORTRAIT_UP || 
    orientation === ScreenOrientation.Orientation.PORTRAIT_DOWN;

  // Use effective dimensions for scaling calculations
  const effectiveWidth = isPortraitMode ? INPUT_HEIGHT : INPUT_WIDTH;
  const effectiveHeight = isPortraitMode ? INPUT_WIDTH : INPUT_HEIGHT;

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
          let textRotation = 0;

          // PROFESSIONAL 4-WAY COORDINATE MAPPING
          if (orientation === ScreenOrientation.Orientation.PORTRAIT_UP) {
            // 90deg CCW
            const mappedX = y;
            const mappedY = INPUT_WIDTH - x;
            rectW = h * scale;
            rectH = w * scale;
            rectX = mappedX * scale - rectW / 2 - offsetX;
            rectY = mappedY * scale - rectH / 2 - offsetY;
            textRotation = 90;
          } 
          else if (orientation === ScreenOrientation.Orientation.PORTRAIT_DOWN) {
            // 90deg CW
            const mappedX = INPUT_HEIGHT - y;
            const mappedY = x;
            rectW = h * scale;
            rectH = w * scale;
            rectX = mappedX * scale - rectW / 2 - offsetX;
            rectY = mappedY * scale - rectH / 2 - offsetY;
            textRotation = -90;
          }
          else if (orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT) {
            // 0deg: Direct mapping
            rectW = w * scale;
            rectH = h * scale;
            rectX = x * scale - rectW / 2 - offsetX;
            rectY = y * scale - rectH / 2 - offsetY;
            textRotation = 0;
          }
          else if (orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT) {
            // 180deg: Mirror both axes
            const mappedX = INPUT_WIDTH - x;
            const mappedY = INPUT_HEIGHT - y;
            rectW = w * scale;
            rectH = h * scale;
            rectX = mappedX * scale - rectW / 2 - offsetX;
            rectY = mappedY * scale - rectH / 2 - offsetY;
            textRotation = 180;
          }
          else {
            // Fallback for unknown states
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
                transform={textRotation !== 0 ? `rotate(${textRotation}, ${rectX}, ${rectY - 5})` : undefined}
              >
                {`${detection.label.toUpperCase()}${isUrgent ? ' !' : ''}`}
              </SvgText>
            </G>
          );
        })}
      </Svg>
      
      <View style={styles.debugContainer}>
        <Text style={styles.debugText}>
          PRO MODE | Ori: {orientation} | Img: {INPUT_WIDTH}x{INPUT_HEIGHT}
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


