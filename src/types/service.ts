/**
 * Service lifecycle states
 */
export type ServiceState =
  | "active" // Service is running
  | "inactive" // Service is stopped
  | "failed" // Service failed to start or crashed
  | "activating" // Service is starting
  | "deactivating" // Service is stopping
  | "unknown"; // Unable to determine state

/**
 * Service status information
 */
export interface ServiceStatus {
  /** Service name */
  name: string;

  /** Current state */
  state: ServiceState;

  /** Process ID (if running) */
  pid?: number;

  /** Memory usage in bytes (if running) */
  memory?: number;

  /** CPU usage percentage (if running) */
  cpu?: number;

  /** Uptime in seconds (if running) */
  uptime?: number;

  /** Restart count */
  restarts?: number;

  /** Last exit code (if failed) */
  exitCode?: number;

  /** Error message (if failed) */
  error?: string;
}

/**
 * Log entry from journalctl
 */
export interface LogEntry {
  /** Timestamp */
  timestamp: Date;

  /** Log level */
  level: LogLevel;

  /** Log message */
  message: string;

  /** Service name */
  service: string;

  /** Process ID */
  pid?: number;
}

/**
 * Log levels (journalctl priority)
 */
export type LogLevel =
  | "emerg" // 0
  | "alert" // 1
  | "crit" // 2
  | "err" // 3
  | "warning" // 4
  | "notice" // 5
  | "info" // 6
  | "debug"; // 7

/**
 * Log query options
 */
export interface LogOptions {
  /** Follow logs (stream) */
  follow?: boolean;

  /** Number of lines to show */
  lines?: number;

  /** Filter by log level */
  level?: LogLevel;

  /** Show logs since timestamp */
  since?: Date | string;

  /** Show logs until timestamp */
  until?: Date | string;

  /** Reverse chronological order */
  reverse?: boolean;
}
