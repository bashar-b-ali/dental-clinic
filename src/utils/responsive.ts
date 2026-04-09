import { Dimensions, PixelRatio, Platform, StatusBar } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Design baseline: standard 375×812 (iPhone X / typical modern phone)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// Scale based on width (for horizontal sizes, font sizes, paddings)
export function wp(size: number): number {
  return PixelRatio.roundToNearestPixel((SCREEN_WIDTH / BASE_WIDTH) * size);
}

// Scale based on height (for vertical sizes, top/bottom paddings)
export function hp(size: number): number {
  return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT / BASE_HEIGHT) * size);
}

// Moderate scale - less aggressive, good for fonts and icons
// factor 0.5 = halfway between no-scale and full-scale
export function ms(size: number, factor: number = 0.5): number {
  return PixelRatio.roundToNearestPixel(size + (wp(size) - size) * factor);
}

// Screen info helpers
export const screen = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  isSmall: SCREEN_WIDTH < 360,   // old/small phones
  isMedium: SCREEN_WIDTH >= 360 && SCREEN_WIDTH < 400,
  isLarge: SCREEN_WIDTH >= 400,
  statusBarHeight: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44,
};

// Number of columns for grids based on screen width
export function gridColumns(minItemWidth: number = 160): number {
  return Math.max(2, Math.floor(SCREEN_WIDTH / minItemWidth));
}

// Responsive image/thumbnail size for grid
export function thumbSize(columns: number = 2, gap: number = 8, padding: number = 16): number {
  return (SCREEN_WIDTH - padding * 2 - gap * (columns - 1)) / columns;
}
