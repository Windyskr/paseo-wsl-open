import { Platform } from "react-native";

// Paseo Desktop (Electron) exposes its bridge on globalThis; browsers and mobile do not.
export function isWindowsDesktopApp(): boolean {
  if (Platform.OS !== "web") return false;
  const bridge = (globalThis as { paseoDesktop?: { platform?: string } }).paseoDesktop;
  return bridge?.platform === "win32";
}
