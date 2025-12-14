import type { CommandContext } from "../../types/cli";
import { logger } from "../../utils/logger";
import { CommandError, ServiceNotFoundError } from "../../utils/errors";
import { SystemdController } from "../../core/systemd";

/**
 * Stop a service
 */
export async function stopCommand(ctx: CommandContext): Promise<void> {
  // Validate service name argument
  const serviceName = ctx.args.args[0];

  if (!serviceName) {
    throw new CommandError(
      "Service name required",
      "Usage: bunman stop <service>"
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

  // Check if service is running
  const isActive = await controller.isActive(app.serviceName);

  if (!isActive) {
    logger.warn(`Service ${serviceName} is not running`);
    return;
  }

  // Stop the service
  logger.step(`Stopping ${app.serviceName}...`);
  await controller.stop(app.serviceName);

  // Verify service stopped
  const status = await controller.getStatus(app.serviceName);

  if (status.state === "inactive") {
    logger.success(`Service ${serviceName} stopped`);
  } else if (status.state === "deactivating") {
    logger.info(`Service ${serviceName} is stopping...`);
  } else {
    logger.warn(`Service ${serviceName} may not have stopped correctly`);
    logger.dim(`  State: ${status.state}`);
  }
}
