import type { CommandContext } from "../../types/cli";
import type { LogOptions } from "../../types/service";
import { logger } from "../../utils/logger";
import { CommandError, ServiceNotFoundError } from "../../utils/errors";
import { SystemdLogger } from "../../core/systemd";
import { getBooleanOption, getNumberOption, getStringOption } from "../parser";

/**
 * View logs for a service
 */
export async function logsCommand(ctx: CommandContext): Promise<void> {
  // Validate service name argument
  const serviceName = ctx.args.args[0];

  if (!serviceName) {
    throw new CommandError(
      "Service name required",
      "Usage: bunpm logs <service>"
    );
  }

  // Config should be loaded by CLI entry
  if (!ctx.config) {
    throw new CommandError(
      "Configuration not loaded",
      'Run "bunpm init" to create a configuration file'
    );
  }

  // Find the app config
  const app = ctx.config.apps[serviceName];

  if (!app) {
    throw new ServiceNotFoundError(
      serviceName,
      Object.keys(ctx.config.apps)
    );
  }

  const userMode = ctx.config.systemd?.userMode ?? false;
  const systemdLogger = new SystemdLogger(userMode);

  // Build log options from CLI flags
  const options: LogOptions = {
    follow: getBooleanOption(ctx.args.options, "follow", "f"),
    lines: getNumberOption(ctx.args.options, "lines", "n", 50),
    since: getStringOption(ctx.args.options, "since"),
    until: getStringOption(ctx.args.options, "until"),
    reverse: getBooleanOption(ctx.args.options, "reverse", "r"),
  };

  // Show what we're doing
  if (options.follow) {
    logger.info(`Streaming logs for ${serviceName}... (Ctrl+C to exit)`);
    logger.dim("");
  }

  // Get and display logs
  await systemdLogger.getLogs(app.serviceName, options);
}
