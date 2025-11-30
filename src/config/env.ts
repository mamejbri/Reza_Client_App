// src/config/env.ts
const USE_USB_REVERSE = true; // set to false for Wi-Fi later

export const API = {
  BASE_URL: __DEV__
    ? (USE_USB_REVERSE
        ? 'http://localhost:8080/api/reza'        // via adb reverse
        : 'http://192.168.100.44:8080/api/reza')  // replace with your PC IP for Wi-Fi
    : 'https://your-production-domain.com/api',
};

