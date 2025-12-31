import type { ServiceManager } from "../../types/backend";
import { SystemdBackend } from "./systemd";
import { LaunchdBackend } from "./launchd";
import { BunmanError } from "../../utils/errors";

/**
 * Get the appropriate service manager for the current platform
 */
export function getServiceManager(): ServiceManager {
  const platform = process.platform;

  switch (platform) {
    case "linux":
      return new SystemdBackend();
    case "darwin":
      return new LaunchdBackend();
    case "win32":
      throw new BunmanError(
        "Windows is not yet supported",
        "bunman currently supports Linux (systemd) and macOS (launchd)"
      );
    default:
      throw new BunmanError(
        `Unsupported platform: ${platform}`,
        "bunman currently supports Linux (systemd) and macOS (launchd)"
      );
  }
}

/**
 * Check if the current platform is supported
 */
export function isPlatformSupported(): boolean {
  const platform = process.platform;
  return platform === "linux" || platform === "darwin";
}

/**
 * Get the platform name for display
 */
export function getPlatformName(): string {
  switch (process.platform) {
    case "linux":
      return "Linux";
    case "darwin":
      return "macOS";
    case "win32":
      return "Windows";
    default:
      return process.platform;
  }
}

