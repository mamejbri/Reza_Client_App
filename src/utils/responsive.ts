import { Platform, useWindowDimensions } from 'react-native';

/** Width the designs were made for (iPhone 12-15 / Pixel 7 class). */
const BASE_WIDTH = 390;
/** Content never grows wider than this (tablets / foldables): it is centered instead. */
export const MAX_CONTENT_WIDTH = 600;
/**
 * Deceleration for the main vertical lists: a fling stops sooner than the platform default
 * (iOS 0.998 / Android 0.985), so scrolling feels calmer and more controlled.
 */
export const SCROLL_DECELERATION = Platform.select({ ios: 0.99, default: 0.95 });

/**
 * Screen-size aware helpers. Re-renders on rotation / window resize (useWindowDimensions).
 * - scale(n): n px on the reference phone, scaled with the screen width but clamped so text and
 *   images neither shrink unreadably on small phones nor balloon on tablets.
 * - contentWidth: usable width for content (screen width, capped on large screens).
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const factor = Math.min(Math.max(contentWidth / BASE_WIDTH, 0.82), 1.25);
  const scale = (size: number) => Math.round(size * factor);

  return {
    width,
    height,
    contentWidth,
    scale,
    isSmall: width < 360,
    isTablet: width >= MAX_CONTENT_WIDTH,
  };
}
