import { resolve, dirname } from "path";
import type {
  BunmanConfig,
  NormalizedConfig,
  NormalizedAppConfig,
} from "../../types/config";
import { ConfigError } from "../../utils/errors";
import { validateConfig } from "./validator";
import {
  CONFIG_NAMES,
  DEFAULT_SERVICE_PREFIX,
  DEFAULT_SERVICE_CONFIG,
} from "../../constants";

/**
 * Load and normalize the bunman configuration
 */
export async function loadConfig(
  cwd: string = process.cwd()
): Promise<NormalizedConfig> {
  const configPath = await findConfigFile(cwd);

  if (!configPath) {
    throw new ConfigError(
      "No bunman.config.ts found",
      'Run "bunman init" to create a configuration file'
    );
  }

  let config: BunmanConfig;

  try {
    // Bun can directly import .ts files
    const module = await import(configPath);
    config = module.default;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    throw new ConfigError(
      `Failed to load config: ${message}`,
      `Check syntax in ${configPath}`
    );
  }

  // Validate config structure
  validateConfig(config);

  // Normalize config (resolve paths, apply defaults)
  const configDir = dirname(configPath);
  const normalized = normalizeConfig(config, configPath, configDir);

  return normalized;
}

/**
 * Find the config file by walking up the directory tree
 */
async function findConfigFile(startDir: string): Promise<string | null> {
  let currentDir = resolve(startDir);

  while (true) {
    for (const name of CONFIG_NAMES) {
      const candidate = resolve(currentDir, name);
      const file = Bun.file(candidate);

      if (await file.exists()) {
        return candidate;
      }
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached filesystem root
      return null;
    }
    currentDir = parentDir;
  }
}

/**
 * Normalize the config by resolving paths and applying defaults
 */
function normalizeConfig(
  config: BunmanConfig,
  configPath: string,
  configDir: string
): NormalizedConfig {
  const defaults = config.defaults ?? {};
  const systemdPrefix = config.systemd?.prefix ?? DEFAULT_SERVICE_PREFIX;

  const apps: Record<string, NormalizedAppConfig> = {};

  for (const [name, app] of Object.entries(config.apps)) {
    // Merge defaults with app config
    const merged = { ...defaults, ...app };

    apps[name] = {
      // Required fields
      cwd: resolve(configDir, merged.cwd),
      command: merged.command,

      // Optional fields with defaults
      env: merged.env ?? DEFAULT_SERVICE_CONFIG.env,
      envFile: merged.envFile ? resolve(configDir, merged.envFile) : undefined,
      user: merged.user,
      group: merged.group,
      description: merged.description ?? `bunman service: ${name}`,
      restart: merged.restart ?? DEFAULT_SERVICE_CONFIG.restart,
      restartSec: merged.restartSec ?? DEFAULT_SERVICE_CONFIG.restartSec,
      after: merged.after ?? DEFAULT_SERVICE_CONFIG.after,
      requires: merged.requires ?? DEFAULT_SERVICE_CONFIG.requires,
      limits: merged.limits ?? DEFAULT_SERVICE_CONFIG.limits,

      // Computed fields
      serviceName: `${systemdPrefix}${name}`,
    };
  }

  return {
    ...config,
    configPath,
    configDir,
    apps,
  };
}

/**
 * Check if a config file exists in the given directory
 */
export async function configExists(cwd: string = process.cwd()): Promise<boolean> {
  const configPath = await findConfigFile(cwd);
  return configPath !== null;
}
