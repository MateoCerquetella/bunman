import type { ServiceStatus, ServiceState } from "../types/service";
import { logger } from "./logger";

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);

  return `${value.toFixed(1)} ${units[i]}`;
}

/**
 * Format seconds to human readable duration
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  const days = Math.floor(hours / 24);
  const hrs = hours % 24;
  return `${days}d ${hrs}h`;
}

/**
 * Get colored state indicator
 */
function getStateIndicator(state: ServiceState): string {
  switch (state) {
    case "active":
      return logger.color.green("●");
    case "inactive":
      return logger.color.gray("○");
    case "failed":
      return logger.color.red("●");
    case "activating":
      return logger.color.yellow("◐");
    case "deactivating":
      return logger.color.yellow("◑");
    default:
      return logger.color.gray("?");
  }
}

/**
 * Get colored state text
 */
function getStateText(state: ServiceState): string {
  switch (state) {
    case "active":
      return logger.color.green("active");
    case "inactive":
      return logger.color.gray("inactive");
    case "failed":
      return logger.color.red("failed");
    case "activating":
      return logger.color.yellow("starting");
    case "deactivating":
      return logger.color.yellow("stopping");
    default:
      return logger.color.gray("unknown");
  }
}

/**
 * Pad a string to a fixed width
 */
function padEnd(str: string, length: number): string {
  // Account for ANSI codes in length calculation
  const visibleLength = str.replace(/\x1b\[[0-9;]*m/g, "").length;
  const padding = Math.max(0, length - visibleLength);
  return str + " ".repeat(padding);
}

/**
 * Format service status as a table
 */
export function formatStatusTable(statuses: ServiceStatus[]): string {
  if (statuses.length === 0) {
    return logger.color.dim("No services configured");
  }

  const lines: string[] = [];

  // Header
  const header = [
    padEnd(logger.color.bold("Service"), 25),
    padEnd(logger.color.bold("Status"), 15),
    padEnd(logger.color.bold("PID"), 10),
    padEnd(logger.color.bold("Memory"), 12),
    logger.color.bold("Uptime"),
  ].join("");

  lines.push(header);
  lines.push(logger.color.dim("─".repeat(70)));

  // Rows
  for (const status of statuses) {
    const indicator = getStateIndicator(status.state);
    const stateText = getStateText(status.state);

    const name = padEnd(status.name, 25);
    const state = padEnd(`${indicator} ${stateText}`, 15);
    const pid = padEnd(status.pid?.toString() ?? "-", 10);
    const memory = padEnd(
      status.memory ? formatBytes(status.memory) : "-",
      12
    );
    const uptime = status.uptime ? formatDuration(status.uptime) : "-";

    lines.push(`${name}${state}${pid}${memory}${uptime}`);
  }

  return lines.join("\n");
}

/**
 * Format a single service status for detailed view
 */
export function formatServiceDetail(status: ServiceStatus): string {
  const lines: string[] = [];

  const indicator = getStateIndicator(status.state);
  const stateText = getStateText(status.state);

  lines.push(`${indicator} ${logger.color.bold(status.name)}`);
  lines.push(`   State: ${stateText}`);

  if (status.pid) {
    lines.push(`   PID: ${status.pid}`);
  }

  if (status.memory) {
    lines.push(`   Memory: ${formatBytes(status.memory)}`);
  }

  if (status.uptime) {
    lines.push(`   Uptime: ${formatDuration(status.uptime)}`);
  }

  if (status.restarts !== undefined && status.restarts > 0) {
    lines.push(`   Restarts: ${status.restarts}`);
  }

  if (status.exitCode !== undefined) {
    lines.push(
      `   Exit Code: ${logger.color.red(status.exitCode.toString())}`
    );
  }

  if (status.error) {
    lines.push(`   Error: ${logger.color.red(status.error)}`);
  }

  return lines.join("\n");
}
