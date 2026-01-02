import type { CommandContext } from "../../types/cli";
import type { NormalizedAppConfig } from "../../types/config";
import { logger } from "../../utils/logger";
import { CommandError, ServiceNotFoundError } from "../../utils/errors";
import { getServiceManager } from "../../core/backend";
import { executeBatch, validateServiceNames } from "../../core/batch";

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

  // Single service - use detailed output
  const serviceName = serviceNames[0]!;
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

  await executeBatch(
    apps as Array<[string, NormalizedAppConfig]>,
    serviceManager,
    {
      presentVerb: "Stopping",
      pastVerb: "stopped",
      execute: async (_name, app, sm) => {
        await sm.stop(app.serviceName);
      },
      shouldSkip: async (_name, app, sm) => {
        return !(await sm.isActive(app.serviceName));
      },
      skipMessage: "already stopped",
      successStates: ["inactive", "deactivating"],
    }
  );
}

/**
 * Stop multiple specific services
 */
async function stopMultipleServices(
  ctx: CommandContext,
  serviceNames: string[]
): Promise<void> {
  validateServiceNames(serviceNames, ctx.config!.apps);

  const apps = serviceNames.map(
    (name) => [name, ctx.config!.apps[name]] as [string, NormalizedAppConfig]
  );
  const serviceManager = getServiceManager();

  await executeBatch(apps, serviceManager, {
    presentVerb: "Stopping",
    pastVerb: "stopped",
    execute: async (_name, app, sm) => {
      await sm.stop(app.serviceName);
    },
    shouldSkip: async (_name, app, sm) => {
      return !(await sm.isActive(app.serviceName));
    },
    skipMessage: "already stopped",
    successStates: ["inactive", "deactivating"],
  });
}
