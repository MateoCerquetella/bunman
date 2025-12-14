import type { CommandContext } from "../../types/cli";
import { logger } from "../../utils/logger";
import { CommandError } from "../../utils/errors";
import { SystemdController } from "../../core/systemd";

/**
 * Stop all services
 */
export async function stopallCommand(ctx: CommandContext): Promise<void> {
  if (!ctx.config) {
    throw new CommandError(
      "Configuration not loaded",
      'Run "bunman init" to create a configuration file'
    );
  }

  const apps = Object.entries(ctx.config.apps);

  if (apps.length === 0) {
    logger.warn("No services defined in config");
    return;
  }

  const userMode = ctx.config.systemd?.userMode ?? false;
  const controller = new SystemdController(userMode);

  logger.info(`Stopping ${apps.length} service(s)...`);
  console.log("");

  let successCount = 0;
  let skippedCount = 0;
  let failCount = 0;

  for (const [name, app] of apps) {
    try {
      // Check if service is running
      const isActive = await controller.isActive(app.serviceName);

      if (!isActive) {
        logger.dim(`  ${name} already stopped`);
        skippedCount++;
        continue;
      }

      logger.step(`Stopping ${name}...`);
      await controller.stop(app.serviceName);

      // Verify
      const status = await controller.getStatus(app.serviceName);

      if (status.state === "inactive" || status.state === "deactivating") {
        logger.success(`  ${name} stopped`);
        successCount++;
      } else {
        logger.warn(`  ${name} may not have stopped correctly`);
        failCount++;
      }
    } catch (error) {
      logger.error(`  ${name} failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      failCount++;
    }
  }

  console.log("");

  if (failCount === 0) {
    if (skippedCount === apps.length) {
      logger.info("All services were already stopped");
    } else {
      logger.success(`Stopped ${successCount} service(s)`);
    }
  } else {
    logger.warn(`Stopped ${successCount}/${apps.length - skippedCount} services (${failCount} failed)`);
  }
}
