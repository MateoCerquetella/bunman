import type { CommandContext } from "../../types/cli";
import { logger } from "../../utils/logger";
import { CommandError, ServiceNotFoundError } from "../../utils/errors";
import { getServiceManager } from "../../core/backend";

/**
 * Stop one or more services
 */
export async function stopCommand(ctx: CommandContext): Promise<void> {
  const serviceNames = ctx.args.args;

  // Config should be loaded by CLI entry
  if (!ctx.config) {
    throw new CommandError(
      "Configuration not loaded",
      'Run "bunman init" to create a configuration file'
    );
  }

  // If no service names provided, stop all services
  if (serviceNames.length === 0) {
    await stopAllServices(ctx);
    return;
  }

  // If multiple service names provided, stop them all
  if (serviceNames.length > 1) {
    await stopMultipleServices(ctx, serviceNames);
    return;
  }

  // Single service - use existing logic
  const serviceName = serviceNames[0];
  const app = ctx.config.apps[serviceName];

  if (!app) {
    throw new ServiceNotFoundError(
      serviceName,
      Object.keys(ctx.config.apps)
    );
  }

  const serviceManager = getServiceManager();

  // Check if service is running
  const isActive = await serviceManager.isActive(app.serviceName);

  if (!isActive) {
    logger.warn(`Service ${serviceName} is not running`);
    return;
  }

  // Stop the service
  logger.step(`Stopping ${app.serviceName}...`);
  await serviceManager.stop(app.serviceName);

  // Verify service stopped
  const status = await serviceManager.getStatus(app.serviceName);

  if (status.state === "inactive") {
    logger.success(`Service ${serviceName} stopped`);
  } else if (status.state === "deactivating") {
    logger.info(`Service ${serviceName} is stopping...`);
  } else {
    logger.warn(`Service ${serviceName} may not have stopped correctly`);
    logger.dim(`  State: ${status.state}`);
  }
}

/**
 * Stop all services
 */
async function stopAllServices(ctx: CommandContext): Promise<void> {
  const apps = Object.entries(ctx.config!.apps);

  if (apps.length === 0) {
    logger.warn("No services defined in config");
    return;
  }

  const serviceManager = getServiceManager();

  logger.info(`Stopping ${apps.length} service(s)...`);
  console.log("");

  let successCount = 0;
  let skippedCount = 0;
  let failCount = 0;

  for (const [name, app] of apps) {
    try {
      // Check if service is running
      const isActive = await serviceManager.isActive(app.serviceName);

      if (!isActive) {
        logger.dim(`  ${name} already stopped`);
        skippedCount++;
        continue;
      }

      logger.step(`Stopping ${name}...`);
      await serviceManager.stop(app.serviceName);

      // Verify
      const status = await serviceManager.getStatus(app.serviceName);

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

/**
 * Stop multiple specific services
 */
async function stopMultipleServices(ctx: CommandContext, serviceNames: string[]): Promise<void> {
  const serviceManager = getServiceManager();

  // Validate all service names first
  const invalidServices = serviceNames.filter(name => !ctx.config!.apps[name]);
  if (invalidServices.length > 0) {
    throw new ServiceNotFoundError(
      invalidServices[0],
      Object.keys(ctx.config!.apps)
    );
  }

  logger.info(`Stopping ${serviceNames.length} service(s)...`);
  console.log("");

  let successCount = 0;
  let skippedCount = 0;
  let failCount = 0;

  for (const name of serviceNames) {
    const app = ctx.config!.apps[name];
    try {
      // Check if service is running
      const isActive = await serviceManager.isActive(app.serviceName);

      if (!isActive) {
        logger.dim(`  ${name} already stopped`);
        skippedCount++;
        continue;
      }

      logger.step(`Stopping ${name}...`);
      await serviceManager.stop(app.serviceName);

      // Verify
      const status = await serviceManager.getStatus(app.serviceName);

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
    if (skippedCount === serviceNames.length) {
      logger.info("All specified services were already stopped");
    } else {
      logger.success(`Stopped ${successCount} service(s)`);
    }
  } else {
    logger.warn(`Stopped ${successCount}/${serviceNames.length - skippedCount} services (${failCount} failed)`);
  }
}
