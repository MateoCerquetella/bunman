import type { CommandContext } from "../../types/cli";
import type { LogOptions } from "../../types/backend";
import { logger } from "../../utils/logger";
import { CommandError, ServiceNotFoundError } from "../../utils/errors";
import { getServiceManager } from "../../core/backend";
import { getBooleanOption, getNumberOption, getStringOption } from "../parser";
import { join } from "path";
import { existsSync, writeFileSync } from "fs";
import { homedir } from "os";

// ANSI color codes for service prefixes
const COLORS = {
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  magenta: "\x1b[35m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  reset: "\x1b[0m",
  dim: "\x1b[2m",
};

const SERVICE_COLORS = [
  COLORS.cyan,
  COLORS.green,
  COLORS.magenta,
  COLORS.yellow,
  COLORS.blue,
];

/**
 * View logs for one or all services
 */
export async function logsCommand(ctx: CommandContext): Promise<void> {
  const serviceName = ctx.args.args[0];

  // Config should be loaded by CLI entry
  if (!ctx.config) {
    throw new CommandError(
      "Configuration not loaded",
      'Run "bunman init" to create a configuration file'
    );
  }

  // Check for --clear flag
  const shouldClear = getBooleanOption(ctx.args.options, "clear");
  if (shouldClear) {
    await clearLogs(ctx, serviceName);
    return;
  }

  // Build log options from CLI flags
  const options: LogOptions = {
    follow: getBooleanOption(ctx.args.options, "follow", "f"),
    lines: getNumberOption(ctx.args.options, "lines", "n", 50),
    since: getStringOption(ctx.args.options, "since"),
  };

  // If no service name provided, show logs for all services
  if (!serviceName) {
    await showAllLogs(ctx, options);
    return;
  }

  // Single service logs
  const app = ctx.config.apps[serviceName];

  if (!app) {
    throw new ServiceNotFoundError(
      serviceName,
      Object.keys(ctx.config.apps)
    );
  }

  const serviceManager = getServiceManager();

  // Show what we're doing
  if (options.follow) {
    logger.info(`Streaming logs for ${serviceName}... (Ctrl+C to exit)`);
    logger.dim("");
  }

  // Get and display logs
  await serviceManager.logs(app.serviceName, options);
}

/**
 * Show logs for all services with colored prefixes
 */
async function showAllLogs(
  ctx: CommandContext,
  options: LogOptions
): Promise<void> {
  const serviceNames = Object.keys(ctx.config!.apps);

  if (serviceNames.length === 0) {
    logger.warn("No services configured");
    return;
  }

  const logDir = join(homedir(), ".bunman", "logs");

  // Find which services have log files
  const servicesWithLogs = serviceNames.filter((name) => {
    const app = ctx.config!.apps[name];
    const logFile = join(logDir, `${app.serviceName}.log`);
    return existsSync(logFile);
  });

  if (servicesWithLogs.length === 0) {
    logger.warn("No log files found for any service");
    logger.info(`Expected log directory: ${logDir}`);
    return;
  }

  logger.info(
    `Streaming logs for ${servicesWithLogs.length} service(s)... (Ctrl+C to exit)`
  );
  logger.dim("");

  // Spawn tail process for each service with colored prefix
  const procs = servicesWithLogs.map((name, index) => {
    const app = ctx.config!.apps[name];
    const logFile = join(logDir, `${app.serviceName}.log`);
    const color = SERVICE_COLORS[index % SERVICE_COLORS.length];

    // Build tail arguments
    const args = ["-f"];
    if (options.lines) {
      args.push("-n", options.lines.toString());
    }
    args.push(logFile);

    // Spawn tail and prefix each line with service name
    return Bun.spawn(["tail", ...args], {
      stdout: "pipe",
      stderr: "inherit",
    });
  });

  // Read from all processes and prefix lines
  const readers = procs.map(async (proc, index) => {
    const name = servicesWithLogs[index];
    const color = SERVICE_COLORS[index % SERVICE_COLORS.length];
    const reader = proc.stdout.getReader();
    const decoder = new TextDecoder();

    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim()) {
          console.log(`${color}[${name}]${COLORS.reset} ${line}`);
        }
      }
    }
  });

  // Wait for all readers (will run indefinitely with -f)
  await Promise.race([...readers, ...procs.map((p) => p.exited)]);
}

/**
 * Clear log files for one or all services
 */
async function clearLogs(
  ctx: CommandContext,
  serviceName?: string
): Promise<void> {
  const logDir = join(homedir(), ".bunman", "logs");

  // If specific service provided, clear only that service's logs
  if (serviceName) {
    const app = ctx.config!.apps[serviceName];
    if (!app) {
      throw new ServiceNotFoundError(
        serviceName,
        Object.keys(ctx.config!.apps)
      );
    }

    const logFile = join(logDir, `${app.serviceName}.log`);
    if (existsSync(logFile)) {
      writeFileSync(logFile, "");
      logger.success(`Cleared logs for ${serviceName}`);
    } else {
      logger.warn(`No log file found for ${serviceName}`);
    }
    return;
  }

  // Clear logs for all services
  const serviceNames = Object.keys(ctx.config!.apps);
  let clearedCount = 0;

  for (const name of serviceNames) {
    const app = ctx.config!.apps[name];
    const logFile = join(logDir, `${app.serviceName}.log`);
    if (existsSync(logFile)) {
      writeFileSync(logFile, "");
      clearedCount++;
    }
  }

  if (clearedCount === 0) {
    logger.warn("No log files found");
  } else {
    logger.success(`Cleared logs for ${clearedCount} service(s)`);
  }
}
