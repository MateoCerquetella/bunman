import type { CommandContext } from "../../types/cli";
import { logger } from "../../utils/logger";
import { CommandError, ServiceNotFoundError } from "../../utils/errors";
import {
  SystemdController,
  getUnitFilePath,
  unitFileExists,
} from "../../core/systemd";
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

  const userMode = ctx.config.systemd?.userMode ?? false;
  const controller = new SystemdController(userMode);
  const force = getBooleanOption(ctx.args.options, "force", "f");

  // Check if unit file exists
  const unitExists = await unitFileExists(app.serviceName, userMode);

  if (!unitExists) {
    logger.warn(`Service ${serviceName} is not installed`);
    return;
  }

  // Confirm removal unless --force is used
  if (!force) {
    logger.warn(`This will remove the systemd unit for ${serviceName}`);
    logger.dim("  Use --force to skip this warning");

    // In a real implementation, we'd prompt for confirmation
    // For now, we'll just require --force
    throw new CommandError(
      "Confirmation required",
      "Run with --force to confirm removal"
    );
  }

  // Step 1: Stop the service if running
  const isActive = await controller.isActive(app.serviceName);
  if (isActive) {
    logger.step(`Stopping ${app.serviceName}...`);
    await controller.stop(app.serviceName);
  }

  // Step 2: Disable the service
  const isEnabled = await controller.isEnabled(app.serviceName);
  if (isEnabled) {
    logger.step(`Disabling ${app.serviceName}...`);
    await controller.disable(app.serviceName);
  }

  // Step 3: Delete the unit file
  logger.step(`Removing unit file...`);
  const unitPath = getUnitFilePath(app.serviceName, userMode);

  try {
    await Bun.file(unitPath).delete();
  } catch (error) {
    throw new CommandError(
      `Failed to delete unit file: ${unitPath}`,
      error instanceof Error ? error.message : "Unknown error"
    );
  }

  // Step 4: Reload systemd daemon
  logger.step("Reloading systemd daemon...");
  await controller.daemonReload();

  logger.success(`Service ${serviceName} removed`);
}
