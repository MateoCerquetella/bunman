import type { CommandContext } from "../../types/cli";
import { logger } from "../../utils/logger";
import { CommandError, ServiceNotFoundError } from "../../utils/errors";
import { getServiceManager } from "../../core/backend";
import { getBooleanOption } from "../parser";

/**
 * Remove a service (stop, disable, delete unit file)
 */
export async function removeCommand(ctx: CommandContext): Promise<void> {
  // Validate service name argument
  const serviceName = ctx.args.args[0];

  if (!serviceName) {
    throw new CommandError(
      "Service name required",
      "Usage: bunman remove <service>"
    );
  }

  // Config should be loaded by CLI entry
  if (!ctx.config) {
    throw new CommandError(
      "Configuration not loaded",
      'Run "bunman init" to create a configuration file'
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

  const serviceManager = getServiceManager();
  const force = getBooleanOption(ctx.args.options, "force", "f");

  // Check if service exists
  const isActive = await serviceManager.isActive(app.serviceName);
  const status = await serviceManager.getStatus(app.serviceName);

  if (!isActive && status.state === "inactive") {
    logger.warn(`Service ${serviceName} is not installed or already stopped`);
    // Try to remove anyway in case the config file exists
  }

  // Confirm removal unless --force is used
  if (!force) {
    logger.warn(`This will remove the service configuration for ${serviceName}`);
    logger.dim("  Use --force to skip this warning");

    // In a real implementation, we'd prompt for confirmation
    // For now, we'll just require --force
    throw new CommandError(
      "Confirmation required",
      "Run with --force to confirm removal"
    );
  }

  // Remove the service
  logger.step(`Removing ${app.serviceName}...`);
  await serviceManager.remove(app.serviceName);

  logger.success(`Service ${serviceName} removed`);
}
