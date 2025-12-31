import type { CommandContext } from "../../types/cli";
import { logger } from "../../utils/logger";
import { CommandError, ServiceNotFoundError } from "../../utils/errors";
import { getOutputMode, formatAppConfigJson } from "../../utils/output";
import { getServiceManager } from "../../core/backend";
import { getBooleanOption } from "../parser";

/**
 * Start one or more services
 */
export async function startCommand(ctx: CommandContext): Promise<void> {
  const serviceNames = ctx.args.args;

  // Config should be loaded by CLI entry
  if (!ctx.config) {
    throw new CommandError(
      "Configuration not loaded",
      'Run "bunman init" to create a configuration file'
    );
  }

  // If no service names provided, start all services
  if (serviceNames.length === 0) {
    await startAllServices(ctx);
    return;
  }

  // If multiple service names provided, start them all
  if (serviceNames.length > 1) {
    await startMultipleServices(ctx, serviceNames);
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

  const dryRun = getBooleanOption(ctx.args.options, "dry-run");
  const outputMode = getOutputMode(ctx.args.options);

  const serviceManager = getServiceManager();

  // Handle dry-run mode
  if (dryRun) {
    const configContent = serviceManager.generateConfig(app.serviceName, app);
    if (outputMode === "json") {
      console.log(JSON.stringify({
        dryRun: true,
        command: "start",
        service: formatAppConfigJson(serviceName, app),
        backend: serviceManager.getName(),
        configContent,
      }, null, 2));
    } else {
      logger.info(`[DRY-RUN] Would start service: ${serviceName}`);
      logger.dim(`  Backend: ${serviceManager.getName()}`);
      console.log("");
      logger.bold("Generated configuration:");
      console.log(logger.color.dim(configContent));
    }
    return;
  }

  // Step 1: Initialize service manager
  logger.step(`Installing ${app.serviceName} on ${serviceManager.getName()}...`);
  await serviceManager.install(app.serviceName, app);

  // Verify service started
  const status = await serviceManager.getStatus(app.serviceName);

  if (outputMode === "json") {
    console.log(JSON.stringify({
      success: status.state === "active" || status.state === "activating",
      command: "start",
      service: serviceName,
      state: status.state,
      pid: status.pid ?? null,
    }, null, 2));
    return;
  }

  if (status.state === "active") {
    logger.success(`Service ${serviceName} is now running`);
    if (status.pid) {
      logger.dim(`  PID: ${status.pid}`);
    }
  } else if (status.state === "activating") {
    logger.warn(`Service ${serviceName} is starting...`);
    logger.dim("  Check status with: bunman status");
  } else {
    logger.warn(`Service ${serviceName} may not have started correctly`);
    logger.dim(`  State: ${status.state}`);
    logger.dim("  Check logs with: bunman logs " + serviceName);
  }
}

/**
 * Start all services
 */
async function startAllServices(ctx: CommandContext): Promise<void> {
  const apps = Object.entries(ctx.config!.apps);

  if (apps.length === 0) {
    logger.warn("No services defined in config");
    return;
  }

  const serviceManager = getServiceManager();

  logger.info(`Starting ${apps.length} service(s)...`);
  console.log("");

  let successCount = 0;
  let failCount = 0;

  for (const [name, app] of apps) {
    try {
      logger.step(`Starting ${name}...`);

      // Install and start the service
      await serviceManager.install(app.serviceName, app);

      // Verify
      const status = await serviceManager.getStatus(app.serviceName);

      if (status.state === "active" || status.state === "activating") {
        logger.success(`  ${name} started`);
        successCount++;
      } else {
        logger.warn(`  ${name} may not have started correctly`);
        failCount++;
      }
    } catch (error) {
      logger.error(`  ${name} failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      failCount++;
    }
  }

  console.log("");

  if (failCount === 0) {
    logger.success(`All ${successCount} service(s) started successfully`);
  } else {
    logger.warn(`Started ${successCount}/${apps.length} services (${failCount} failed)`);
  }
}

/**
 * Start multiple specific services
 */
async function startMultipleServices(ctx: CommandContext, serviceNames: string[]): Promise<void> {
  const serviceManager = getServiceManager();

  // Validate all service names first
  const invalidServices = serviceNames.filter(name => !ctx.config!.apps[name]);
  if (invalidServices.length > 0) {
    throw new ServiceNotFoundError(
      invalidServices[0],
      Object.keys(ctx.config!.apps)
    );
  }

  logger.info(`Starting ${serviceNames.length} service(s)...`);
  console.log("");

  let successCount = 0;
  let failCount = 0;

  for (const name of serviceNames) {
    const app = ctx.config!.apps[name];
    try {
      logger.step(`Starting ${name}...`);

      // Install and start the service
      await serviceManager.install(app.serviceName, app);

      // Verify
      const status = await serviceManager.getStatus(app.serviceName);

      if (status.state === "active" || status.state === "activating") {
        logger.success(`  ${name} started`);
        successCount++;
      } else {
        logger.warn(`  ${name} may not have started correctly`);
        failCount++;
      }
    } catch (error) {
      logger.error(`  ${name} failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      failCount++;
    }
  }

  console.log("");

  if (failCount === 0) {
    logger.success(`All ${successCount} service(s) started successfully`);
  } else {
    logger.warn(`Started ${successCount}/${serviceNames.length} services (${failCount} failed)`);
  }
}
