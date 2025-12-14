import type { CommandContext } from "../../types/cli";
import { logger } from "../../utils/logger";
import { CommandError } from "../../utils/errors";
import {
  generateUnitFile,
  SystemdController,
  getUnitFilePath,
  ensureUnitDirectory,
} from "../../core/systemd";

/**
 * Start all services
 */
export async function startallCommand(ctx: CommandContext): Promise<void> {
  if (!ctx.config) {
    throw new CommandError(
      "Configuration not loaded",
      'Run "bunpm init" to create a configuration file'
    );
  }

  const apps = Object.entries(ctx.config.apps);

  if (apps.length === 0) {
    logger.warn("No services defined in config");
    return;
  }

  const userMode = ctx.config.systemd?.userMode ?? false;
  const controller = new SystemdController(userMode);

  logger.info(`Starting ${apps.length} service(s)...`);
  console.log("");

  let successCount = 0;
  let failCount = 0;

  for (const [name, app] of apps) {
    try {
      logger.step(`Starting ${name}...`);

      // Generate unit file
      const unitContent = generateUnitFile(app);
      const unitPath = getUnitFilePath(app.serviceName, userMode);

      await ensureUnitDirectory(userMode);
      await Bun.write(unitPath, unitContent);

      // Reload, enable, start
      await controller.daemonReload();
      await controller.enable(app.serviceName);
      await controller.start(app.serviceName);

      // Verify
      const status = await controller.getStatus(app.serviceName);

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
