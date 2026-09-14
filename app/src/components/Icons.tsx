import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function BellIcon({ size = 19, color = 'currentColor', strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Path d="M18 15.5H6l1.5-3V9.2a4.5 4.5 0 0 1 9 0v3.3z" strokeLinejoin="round" />
      <Path d="M10.4 18.6a1.7 1.7 0 0 0 3.2 0" />
    </Svg>
  );
}

export function HomeIcon({ size = 21, color = 'currentColor', strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Path d="M3.5 11.2L12 4.2l8.5 7v8.6h-17z" strokeLinejoin="round" />
    </Svg>
  );
}

export function HeartIcon({ size = 21, color = 'currentColor', strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Path d="M12 20s-7.5-4.6-7.5-9.6A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 3.2C19.5 15.4 12 20 12 20z" strokeLinejoin="round" />
    </Svg>
  );
}

export function PersonIcon({ size = 21, color = 'currentColor', strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Circle cx="12" cy="8.5" r="3.4" />
      <Path d="M5 20a7 7 0 0 1 14 0" />
    </Svg>
  );
}

export function GearIcon({ size = 21, color = 'currentColor', strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Path d="M11 4h2l.4 2.2 1.9.8 1.9-1.2 1.4 1.4-1.2 1.9.8 1.9L20.4 11v2l-2.2.4-.8 1.9 1.2 1.9-1.4 1.4-1.9-1.2-1.9.8L13 20.4h-2l-.4-2.2-1.9-.8-1.9 1.2-1.4-1.4 1.2-1.9-.8-1.9L3.6 13v-2l2.2-.4.8-1.9L5.4 6.8 6.8 5.4l1.9 1.2 1.9-.8z" />
      <Circle cx="12" cy="12" r="2.6" />
    </Svg>
  );
}

export function LockIcon({ size = 17, color = '#dcb98f', strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Rect x="4.5" y="10.5" width="15" height="9.5" rx="2.5" />
      <Path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </Svg>
  );
}

export function CheckIcon({ size = 19, color = 'currentColor', strokeWidth = 1.9 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Path d="M5 12.5l4.2 4.2L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
