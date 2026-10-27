import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Android shell configuration.
 * VibeTube uses server functions for YouTube discovery and Supabase data,
 * so the native shell must load the deployed HTTPS application URL.
 * Set CAPACITOR_SERVER_URL in the environment before running `npx cap sync`.
 */
const serverUrl = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: "com.vibetube.app",
  appName: "VibeTube",
  webDir: ".output/public",
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: false,
        },
      }
    : {}),
  android: {
    allowMixedContent: false,
    captureInput: true,
  },
};

export default config;
