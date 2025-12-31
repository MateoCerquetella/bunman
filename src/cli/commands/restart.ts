import type { CommandContext } from "../../types/cli";
import { logger } from "../../utils/logger";
import { CommandError, ServiceNotFoundError } from "../../utils/errors";
import { getServiceManager } from "../../core/backend";

/**
 * Restart one or more services
 */
export async function restartCommand(ctx: CommandContext): Promise<void> {
  const serviceNames = ctx.args.args;

  // Config should be loaded by CLI entry
  if (!ctx.config) {
    throw new CommandError(
      "Configuration not loaded",
      'Run "bunman init" to create a configuration file'
    );
  }

  // If no service names provided, restart all services
  if (serviceNames.length === 0) {
    await restartAllServices(ctx);
    return;
  }

  // If multiple service names provided, restart them all
  if (serviceNames.length > 1) {
    await restartMultipleServices(ctx, serviceNames);
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

  // Check if service is active
  const isActive = await serviceManager.isActive(app.serviceName);

  if (!isActive) {
    // Service hasn't been started yet, do a full install and start
    logger.info(`Service ${serviceName} not found, performing initial start...`);
    logger.step(`Installing ${app.serviceName}...`);
    await serviceManager.install(app.serviceName, app);
  } else {
    // Service exists, reinstall to pick up config changes and restart
    logger.step(`Updating ${app.serviceName}...`);
    await serviceManager.install(app.serviceName, app);
    
    // Restart the service
    logger.step(`Restarting ${app.serviceName}...`);
    await serviceManager.restart(app.serviceName);
  }

  // Verify service restarted
  const status = await serviceManager.getStatus(app.serviceName);

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

/**
 * Restart all services
 */
async function restartAllServices(ctx: CommandContext): Promise<void> {
  const apps = Object.entries(ctx.config!.apps);

  if (apps.length === 0) {
    logger.warn("No services defined in config");
    return;
  }

  const serviceManager = getServiceManager();

  logger.info(`Restarting ${apps.length} service(s)...`);
  console.log("");

  let successCount = 0;
  let failCount = 0;

  for (const [name, app] of apps) {
    try {
      logger.step(`Restarting ${name}...`);

      // Reinstall to pick up config changes
      await serviceManager.install(app.serviceName, app);

      // Restart the service
      await serviceManager.restart(app.serviceName);

      // Verify
      const status = await serviceManager.getStatus(app.serviceName);

      if (status.state === "active" || status.state === "activating") {
        logger.success(`  ${name} restarted`);
        successCount++;
      } else {
        logger.warn(`  ${name} may not have restarted correctly`);
        failCount++;
      }
    } catch (error) {
      logger.error(`  ${name} failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      failCount++;
    }
  }

  console.log("");

  if (failCount === 0) {
    logger.success(`All ${successCount} service(s) restarted successfully`);
  } else {
    logger.warn(`Restarted ${successCount}/${apps.length} services (${failCount} failed)`);
  }
}

/**
 * Restart multiple specific services
 */
async function restartMultipleServices(ctx: CommandContext, serviceNames: string[]): Promise<void> {
  const serviceManager = getServiceManager();

  // Validate all service names first
  const invalidServices = serviceNames.filter(name => !ctx.config!.apps[name]);
  if (invalidServices.length > 0) {
    throw new ServiceNotFoundError(
      invalidServices[0],
      Object.keys(ctx.config!.apps)
    );
  }

  logger.info(`Restarting ${serviceNames.length} service(s)...`);
  console.log("");

  let successCount = 0;
  let failCount = 0;

  for (const name of serviceNames) {
    const app = ctx.config!.apps[name];
    try {
      logger.step(`Restarting ${name}...`);

      // Reinstall to pick up config changes
      await serviceManager.install(app.serviceName, app);

      // Restart the service
      await serviceManager.restart(app.serviceName);

      // Verify
      const status = await serviceManager.getStatus(app.serviceName);

      if (status.state === "active" || status.state === "activating") {
        logger.success(`  ${name} restarted`);
        successCount++;
      } else {
        logger.warn(`  ${name} may not have restarted correctly`);
        failCount++;
      }
    } catch (error) {
      logger.error(`  ${name} failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      failCount++;
    }
  }

  console.log("");

  if (failCount === 0) {
    logger.success(`All ${successCount} service(s) restarted successfully`);
  } else {
    logger.warn(`Restarted ${successCount}/${serviceNames.length} services (${failCount} failed)`);
  }
}
