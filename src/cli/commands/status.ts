import type { CommandContext } from "../../types/cli";
import { logger } from "../../utils/logger";
import { CommandError, ServiceNotFoundError } from "../../utils/errors";
import { formatStatusTable, formatServiceDetail } from "../../utils/format";
import { getOutputMode, formatStatusJson } from "../../utils/output";
import { SystemdController } from "../../core/systemd";

/**
 * Show status of all services
 */
export async function statusCommand(ctx: CommandContext): Promise<void> {
  // Config should be loaded by CLI entry
  if (!ctx.config) {
    throw new CommandError(
      "Configuration not loaded",
      'Run "bunman init" to create a configuration file'
    );
  }

  const userMode = ctx.config.systemd?.userMode ?? false;
  const controller = new SystemdController(userMode);
  const outputMode = getOutputMode(ctx.args.options);

  // Check if a specific service was requested
  const specificService = ctx.args.args[0];

  if (specificService) {
    // Show detailed status for one service
    const app = ctx.config.apps[specificService];

    if (!app) {
      throw new ServiceNotFoundError(
        specificService,
        Object.keys(ctx.config.apps)
      );
    }

    const status = await controller.getStatus(app.serviceName);

    // Update name to show user-friendly name
    status.name = specificService;

    if (outputMode === "json") {
      console.log(JSON.stringify(formatStatusJson([status]), null, 2));
      return;
    }

    console.log(formatServiceDetail(status));
  } else {
    // Show table of all services
    const apps = Object.entries(ctx.config.apps);

    if (apps.length === 0) {
      if (outputMode === "json") {
        console.log(JSON.stringify({ services: [], summary: { total: 0, active: 0, inactive: 0, failed: 0 } }, null, 2));
        return;
      }
      logger.warn("No services defined in config");
      logger.dim('Add services to bunman.config.ts and run "bunman start <service>"');
      return;
    }

    // Get status for all services
    const serviceNames = apps.map(([_, app]) => app.serviceName);
    const statuses = await controller.getAllStatuses(serviceNames);

    // Map back to user-friendly names
    for (let i = 0; i < statuses.length; i++) {
      const [name] = apps[i]!;
      statuses[i]!.name = name;
    }

    if (outputMode === "json") {
      console.log(JSON.stringify(formatStatusJson(statuses), null, 2));
      return;
    }

    console.log("");
    console.log(formatStatusTable(statuses));
    console.log("");
  }
}
