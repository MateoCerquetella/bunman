import type { ServiceStatus } from "../types/service";
import type { NormalizedAppConfig } from "../types/config";

/**
 * Output mode for CLI commands
 */
export type OutputMode = "text" | "json";

/**
 * Get the output mode from command options
 */
export function getOutputMode(
  options: Record<string, string | boolean>
): OutputMode {
  if (options["json"] === true) {
    return "json";
  }
  return "text";
}

/**
 * Output interface for structured data
 */
export interface CommandOutput {
  success: boolean;
  command: string;
  data?: unknown;
  error?: string;
  message?: string;
}

/**
 * Print output in the specified format
 */
export function printOutput(output: CommandOutput, mode: OutputMode): void {
  if (mode === "json") {
    console.log(JSON.stringify(output, null, 2));
  }
  // Text mode handled by individual commands
}

/**
 * Format service status for JSON output
 */
export function formatStatusJson(statuses: ServiceStatus[]): object {
  return {
    services: statuses.map((s) => ({
      name: s.name,
      state: s.state,
      pid: s.pid ?? null,
      memory: s.memory ?? null,
      uptime: s.uptime ?? null,
      restarts: s.restarts ?? null,
      exitCode: s.exitCode ?? null,
      error: s.error ?? null,
    })),
    summary: {
      total: statuses.length,
      active: statuses.filter((s) => s.state === "active").length,
      inactive: statuses.filter((s) => s.state === "inactive").length,
      failed: statuses.filter((s) => s.state === "failed").length,
    },
  };
}

/**
 * Format app config for JSON output (dry-run)
 */
export function formatAppConfigJson(
  name: string,
  app: NormalizedAppConfig
): object {
  return {
    name,
    serviceName: app.serviceName,
    cwd: app.cwd,
    command: app.command,
    env: app.env,
    user: app.user ?? null,
    group: app.group ?? null,
    description: app.description,
    restart: app.restart,
    restartSec: app.restartSec,
    limits: app.limits,
  };
}
