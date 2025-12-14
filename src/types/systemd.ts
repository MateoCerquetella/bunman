import type { RestartPolicy } from "./config";

/**
 * systemd unit file structure
 */
export interface SystemdUnit {
  Unit: UnitSection;
  Service: ServiceSection;
  Install: InstallSection;
}

/**
 * [Unit] section
 */
export interface UnitSection {
  Description: string;
  Documentation?: string[];
  After?: string[];
  Requires?: string[];
  Wants?: string[];
  Before?: string[];
}

/**
 * [Service] section
 */
export interface ServiceSection {
  Type: ServiceType;
  WorkingDirectory: string;
  ExecStart: string;
  ExecStop?: string;
  ExecReload?: string;
  Restart: RestartPolicy;
  RestartSec: number;
  Environment?: string[];
  EnvironmentFile?: string;
  StandardOutput: OutputDestination;
  StandardError: OutputDestination;
  User?: string;
  Group?: string;

  // Resource limits
  MemoryMax?: string;
  CPUQuota?: string;
  LimitNOFILE?: number;
  LimitNPROC?: number;

  // Security
  PrivateTmp?: boolean;
  NoNewPrivileges?: boolean;
  ProtectSystem?: "strict" | "full" | "yes" | "no";
  ProtectHome?: boolean | "read-only" | "tmpfs";
}

/**
 * [Install] section
 */
export interface InstallSection {
  WantedBy: string[];
  RequiredBy?: string[];
  Alias?: string[];
}

/**
 * Service type options
 */
export type ServiceType =
  | "simple" // Default, process doesn't fork
  | "exec" // Like simple but waits for exec
  | "forking" // Process forks and parent exits
  | "oneshot" // Short-lived process
  | "notify" // Process sends ready notification
  | "idle"; // Delayed until no jobs running

/**
 * Output destination options
 */
export type OutputDestination =
  | "journal" // systemd journal
  | "syslog" // syslog
  | "kmsg" // kernel log
  | "console" // console
  | "null"; // discard

/**
 * systemd control operations
 */
export type SystemdOperation =
  | "start"
  | "stop"
  | "restart"
  | "reload"
  | "enable"
  | "disable"
  | "status"
  | "daemon-reload";
