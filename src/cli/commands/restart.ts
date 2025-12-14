import type { CommandContext } from "../../types/cli";
import { logger } from "../../utils/logger";
import { CommandError, ServiceNotFoundError } from "../../utils/errors";
import {
  generateUnitFile,
  SystemdController,
  getUnitFilePath,
  ensureUnitDirectory,
  unitFileExists,
} from "../../core/systemd";

/**
 * Restart a service
 */
export async function restartCommand(ctx: CommandContext): Promise<void> {
  // Validate service name argument
  const serviceName = ctx.args.args[0];

  if (!serviceName) {
    throw new CommandError(
      "Service name required",
      "Usage: bunman restart <service>"
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

  // Check if unit file exists
  const unitExists = await unitFileExists(app.serviceName, userMode);

  if (!unitExists) {
    // Service hasn't been started yet, do a full start
    logger.info(`Service ${serviceName} not found, performing initial start...`);

    // Generate unit file
    logger.step(`Generating systemd unit for ${app.serviceName}...`);
    const unitContent = generateUnitFile(app);
    const unitPath = getUnitFilePath(app.serviceName, userMode);

    await ensureUnitDirectory(userMode);
    await Bun.write(unitPath, unitContent);

    // Reload and enable
    await controller.daemonReload();
    await controller.enable(app.serviceName);
  } else {
    // Regenerate unit file in case config changed
    logger.step(`Updating systemd unit for ${app.serviceName}...`);
    const unitContent = generateUnitFile(app);
    const unitPath = getUnitFilePath(app.serviceName, userMode);

    await Bun.write(unitPath, unitContent);
    await controller.daemonReload();
  }

  // Restart the service
  logger.step(`Restarting ${app.serviceName}...`);
  await controller.restart(app.serviceName);

  // Verify service restarted
  const status = await controller.getStatus(app.serviceName);

  if (status.state === "active") {
    logger.success(`Service ${serviceName} restarted`);
    if (status.pid) {
      logger.dim(`  PID: ${status.pid}`);
    }
  } else if (status.state === "activating") {
    logger.info(`Service ${serviceName} is restarting...`);
    logger.dim("  Check status with: bunman status");
  } else {
    logger.warn(`Service ${serviceName} may not have restarted correctly`);
    logger.dim(`  State: ${status.state}`);
    logger.dim("  Check logs with: bunman logs " + serviceName);
  }
}
