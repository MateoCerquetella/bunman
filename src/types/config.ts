/**
 * bunpm configuration file structure
 */
export interface BunpmConfig {
  /** Application definitions */
  apps: Record<string, AppConfig>;

  /** Global defaults applied to all apps */
  defaults?: Partial<AppConfig>;

  /** systemd settings */
  systemd?: SystemdSettings;
}

/**
 * Individual application configuration
 */
export interface AppConfig {
  /** Working directory (relative to config file or absolute) */
  cwd: string;

  /** Command to execute (e.g., "bun run start") */
  command: string;

  /** Environment variables */
  env?: Record<string, string>;

  /** Path to environment file (e.g., ".env" or "/etc/myapp/env") */
  envFile?: string;

  /** Unix user to run as */
  user?: string;

  /** Unix group to run as */
  group?: string;

  /** Service description */
  description?: string;

  /** Restart policy */
  restart?: RestartPolicy;

  /** Restart delay in seconds */
  restartSec?: number;

  /** Dependencies (other systemd units) */
  after?: string[];
  requires?: string[];

  /** Resource limits */
  limits?: ResourceLimits;
}

/**
 * Restart policy options
 */
export type RestartPolicy =
  | "always" // Always restart
  | "on-failure" // Restart on non-zero exit
  | "on-abnormal" // Restart on signal/timeout/watchdog
  | "no"; // Never restart

/**
 * Resource limits for services
 */
export interface ResourceLimits {
  /** Max memory in MB */
  memory?: number;

  /** CPU quota percentage (100 = 1 core) */
  cpu?: number;

  /** Max number of file descriptors */
  nofile?: number;

  /** Max number of processes */
  nproc?: number;
}

/**
 * Global systemd settings
 */
export interface SystemdSettings {
  /** systemd unit file location */
  unitPath?: string;

  /** Service name prefix */
  prefix?: string;

  /** Use user-level systemd instead of system */
  userMode?: boolean;
}

/**
 * Validated and normalized config (after loading)
 */
export interface NormalizedConfig extends BunpmConfig {
  /** Absolute path to config file */
  configPath: string;

  /** Config file directory (for resolving relative paths) */
  configDir: string;

  /** All apps with defaults applied */
  apps: Record<string, NormalizedAppConfig>;
}

/**
 * Normalized app config with all defaults applied
 */
export interface NormalizedAppConfig {
  /** Absolute working directory */
  cwd: string;

  /** Command to execute */
  command: string;

  /** Environment variables */
  env: Record<string, string>;

  /** Absolute path to environment file */
  envFile?: string;

  /** Unix user to run as */
  user?: string;

  /** Unix group to run as */
  group?: string;

  /** Service description */
  description: string;

  /** Restart policy */
  restart: RestartPolicy;

  /** Restart delay in seconds */
  restartSec: number;

  /** Dependencies (other systemd units) */
  after: string[];
  requires: string[];

  /** Resource limits */
  limits: ResourceLimits;

  /** Service name (app name with prefix) */
  serviceName: string;
}
