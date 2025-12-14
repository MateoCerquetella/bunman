import { resolve } from "path";
import type { CommandContext } from "../../types/cli";
import { logger } from "../../utils/logger";
import { BunmanError } from "../../utils/errors";
import {
  CONFIG_TEMPLATE,
  CONFIG_TEMPLATE_MINIMAL,
  CONFIG_TEMPLATE_MONOREPO,
} from "../../core/config/template";
import { getBooleanOption } from "../parser";

/**
 * Initialize a new bunman configuration file
 */
export async function initCommand(ctx: CommandContext): Promise<void> {
  const configPath = resolve(ctx.cwd, "bunman.config.ts");
  const file = Bun.file(configPath);

  // Check if config already exists
  if (await file.exists()) {
    throw new BunmanError(
      "bunman.config.ts already exists",
      "Delete the existing file or edit it directly"
    );
  }

  // Determine template type
  const minimal = getBooleanOption(ctx.args.options, "minimal");
  const monorepo = getBooleanOption(ctx.args.options, "monorepo");

  let template: string;
  let templateName: string;

  if (minimal) {
    template = CONFIG_TEMPLATE_MINIMAL;
    templateName = "minimal";
  } else if (monorepo) {
    template = CONFIG_TEMPLATE_MONOREPO;
    templateName = "monorepo";
  } else {
    template = CONFIG_TEMPLATE;
    templateName = "default";
  }

  // Write the config file
  await Bun.write(configPath, template);

  logger.success(`Created bunman.config.ts (${templateName} template)`);
  logger.info("Edit the file to configure your services");
  logger.dim("");
  logger.dim("Next steps:");
  logger.dim("  1. Edit bunman.config.ts to define your services");
  logger.dim("  2. Run 'bunman start <service>' to start a service");
}
