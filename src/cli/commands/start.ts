import type { CommandContext } from "../../types/cli";
import { logger } from "../../utils/logger";
import { CommandError, ServiceNotFoundError } from "../../utils/errors";
import { getOutputMode, formatAppConfigJson } from "../../utils/output";
import {
  generateUnitFile,
  SystemdController,
  getUnitFilePath,
  ensureUnitDirectory,
} from "../../core/systemd";
import { getBooleanOption } from "../parser";

/**
 * Start a service
 */
export async function startCommand(ctx: CommandContext): Promise<void> {
  // Validate service name argument
  const serviceName = ctx.args.args[0];

  if (!serviceName) {
    throw new CommandError(
      "Service name required",
      "Usage: bunman start <service>"
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
  const dryRun = getBooleanOption(ctx.args.options, "dry-run");
  const outputMode = getOutputMode(ctx.args.options);

  // Generate unit file content
  const unitContent = generateUnitFile(app);
  const unitPath = getUnitFilePath(app.serviceName, userMode);

  // Handle dry-run mode
  if (dryRun) {
    if (outputMode === "json") {
      console.log(JSON.stringify({
        dryRun: true,
        command: "start",
        service: formatAppConfigJson(serviceName, app),
        unitPath,
        unitContent,
      }, null, 2));
    } else {
      logger.info(`[DRY-RUN] Would start service: ${serviceName}`);
      logger.dim(`  Unit path: ${unitPath}`);
      console.log("");
      logger.bold("Generated unit file:");
      console.log(logger.color.dim(unitContent));
    }
    return;
  }

  const controller = new SystemdController(userMode);

  // Step 1: Generate unit file
  logger.step(`Generating systemd unit for ${app.serviceName}...`);

  // Ensure directory exists (for user mode)
  await ensureUnitDirectory(userMode);

  // Write unit file
  await Bun.write(unitPath, unitContent);
  logger.dim(`  → ${unitPath}`);

  // Step 2: Reload systemd daemon
  logger.step("Reloading systemd daemon...");
  await controller.daemonReload();

  // Step 3: Enable service
  logger.step(`Enabling ${app.serviceName}...`);
  await controller.enable(app.serviceName);

  // Step 4: Start service
  logger.step(`Starting ${app.serviceName}...`);
  await controller.start(app.serviceName);

  // Verify service started
  const status = await controller.getStatus(app.serviceName);

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
