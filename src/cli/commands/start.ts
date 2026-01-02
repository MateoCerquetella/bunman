import type { CommandContext } from "../../types/cli";
import type { NormalizedAppConfig } from "../../types/config";
import { logger } from "../../utils/logger";
import { CommandError, ServiceNotFoundError } from "../../utils/errors";
import { getOutputMode, formatAppConfigJson } from "../../utils/output";
import { getServiceManager } from "../../core/backend";
import { executeBatch, validateServiceNames } from "../../core/batch";
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

  // Single service - use detailed output
  const serviceName = serviceNames[0]!;
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

  await executeBatch(
    apps as Array<[string, NormalizedAppConfig]>,
    serviceManager,
    {
      presentVerb: "Starting",
      pastVerb: "started",
      execute: async (_name, app, sm) => {
        await sm.install(app.serviceName, app);
      },
      successStates: ["active", "activating"],
    }
  );
}

/**
 * Start multiple specific services
 */
async function startMultipleServices(
  ctx: CommandContext,
  serviceNames: string[]
): Promise<void> {
  validateServiceNames(serviceNames, ctx.config!.apps);

  const apps = serviceNames.map(
    (name) => [name, ctx.config!.apps[name]] as [string, NormalizedAppConfig]
  );
  const serviceManager = getServiceManager();

  await executeBatch(apps, serviceManager, {
    presentVerb: "Starting",
    pastVerb: "started",
    execute: async (_name, app, sm) => {
      await sm.install(app.serviceName, app);
    },
    successStates: ["active", "activating"],
  });
}
