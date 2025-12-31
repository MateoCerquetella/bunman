import type { NormalizedAppConfig } from "./config";
import type { ServiceStatus } from "./service";

/**
 * Log viewing options
 */
export interface LogOptions {
  /** Follow log output */
  follow?: boolean;
  /** Number of lines to show */
  lines?: number;
  /** Show logs since timestamp */
  since?: string;
}

/**
 * Service Manager interface - abstraction over platform-specific service managers
 */
export interface ServiceManager {
  /**
   * Initialize the service manager (e.g., create directories)
   */
  init(): Promise<void>;

  /**
   * Start a service
   */
  start(serviceName: string): Promise<void>;

  /**
   * Stop a service
   */
  stop(serviceName: string): Promise<void>;

  /**
   * Restart a service
   */
  restart(serviceName: string): Promise<void>;

  /**
   * Get the status of a service
   */
  getStatus(serviceName: string): Promise<ServiceStatus>;

  /**
   * Get the status of multiple services
   */
  getAllStatuses(serviceNames: string[]): Promise<ServiceStatus[]>;

  /**
   * Check if a service is active
   */
  isActive(serviceName: string): Promise<boolean>;

  /**
   * View service logs
   */
  logs(serviceName: string, options: LogOptions): Promise<void>;

  /**
   * Generate service configuration from app config
   */
  generateConfig(serviceName: string, app: NormalizedAppConfig): string;

  /**
   * Install service configuration and enable it
   */
  install(serviceName: string, app: NormalizedAppConfig): Promise<void>;

  /**
   * Remove a service (stop, disable, and remove config)
   */
  remove(serviceName: string): Promise<void>;

  /**
   * Reload service manager configuration
   */
  reload(): Promise<void>;

  /**
   * Enable a service (auto-start on boot)
   */
  enable(serviceName: string): Promise<void>;

  /**
   * Disable a service
   */
  disable(serviceName: string): Promise<void>;

  /**
   * Check if the service manager is available on this platform
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get the name of this service manager
   */
  getName(): string;
}

/**
 * Platform type
 */
export type Platform = "linux" | "darwin" | "win32";

/**
 * Backend type
 */
export type BackendType = "systemd" | "launchd" | "windows";

