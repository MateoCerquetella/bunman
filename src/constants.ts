/**
 * bunpm version
 */
export const VERSION = "0.1.0";

/**
 * bunpm name
 */
export const NAME = "bunpm";

/**
 * Config file names to search for
 */
export const CONFIG_NAMES = ["bunpm.config.ts", "bunpm.config.js"] as const;

/**
 * Default service name prefix
 */
export const DEFAULT_SERVICE_PREFIX = "bunpm-";

/**
 * Default systemd paths
 */
export const SYSTEMD_PATHS = {
  /** System-level unit files */
  system: "/etc/systemd/system",

  /** User-level unit files */
  user: `${process.env["HOME"]}/.config/systemd/user`,
} as const;

/**
 * Default service configuration
 */
export const DEFAULT_SERVICE_CONFIG = {
  restart: "always" as const,
  restartSec: 3,
  after: ["network.target"] as string[],
  requires: [] as string[],
  env: {} as Record<string, string>,
  limits: {},
};
