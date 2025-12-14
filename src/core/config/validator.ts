import type { BunpmConfig, AppConfig, RestartPolicy } from "../../types/config";
import { ConfigError } from "../../utils/errors";

const VALID_RESTART_POLICIES: RestartPolicy[] = [
  "always",
  "on-failure",
  "on-abnormal",
  "no",
];

/**
 * Validate the bunpm configuration structure
 */
export function validateConfig(config: unknown): asserts config is BunpmConfig {
  if (!config || typeof config !== "object") {
    throw new ConfigError(
      "Invalid config: expected an object",
      "Config must export a default object with 'apps' property"
    );
  }

  const configObj = config as Record<string, unknown>;

  // Check apps property exists
  if (!("apps" in configObj)) {
    throw new ConfigError(
      "Invalid config: missing 'apps' property",
      "Config must have an 'apps' object with service definitions"
    );
  }

  if (typeof configObj["apps"] !== "object" || configObj["apps"] === null) {
    throw new ConfigError(
      "Invalid config: 'apps' must be an object",
      "Apps should be an object mapping service names to configurations"
    );
  }

  const apps = configObj["apps"] as Record<string, unknown>;

  // Check at least one app is defined
  if (Object.keys(apps).length === 0) {
    throw new ConfigError(
      "Invalid config: no apps defined",
      "Define at least one app in the 'apps' object"
    );
  }

  // Validate each app
  for (const [name, app] of Object.entries(apps)) {
    validateAppConfig(name, app);
  }

  // Validate defaults if present
  if ("defaults" in configObj && configObj["defaults"] !== undefined) {
    validateDefaults(configObj["defaults"]);
  }

  // Validate systemd settings if present
  if ("systemd" in configObj && configObj["systemd"] !== undefined) {
    validateSystemdSettings(configObj["systemd"]);
  }
}

/**
 * Validate a single app configuration
 */
function validateAppConfig(name: string, app: unknown): asserts app is AppConfig {
  if (!app || typeof app !== "object") {
    throw new ConfigError(
      `Invalid config for app '${name}': expected an object`,
      `Each app must be an object with 'cwd' and 'command' properties`
    );
  }

  const appObj = app as Record<string, unknown>;

  // Required: cwd
  if (!("cwd" in appObj) || typeof appObj["cwd"] !== "string") {
    throw new ConfigError(
      `Invalid config for app '${name}': missing or invalid 'cwd'`,
      "'cwd' must be a string path to the working directory"
    );
  }

  if (appObj["cwd"].length === 0) {
    throw new ConfigError(
      `Invalid config for app '${name}': 'cwd' cannot be empty`,
      "Provide a valid working directory path"
    );
  }

  // Required: command
  if (!("command" in appObj) || typeof appObj["command"] !== "string") {
    throw new ConfigError(
      `Invalid config for app '${name}': missing or invalid 'command'`,
      "'command' must be a string (e.g., 'bun run start')"
    );
  }

  if (appObj["command"].length === 0) {
    throw new ConfigError(
      `Invalid config for app '${name}': 'command' cannot be empty`,
      "Provide a valid command to run"
    );
  }

  // Optional: env
  if ("env" in appObj && appObj["env"] !== undefined) {
    if (typeof appObj["env"] !== "object" || appObj["env"] === null) {
      throw new ConfigError(
        `Invalid config for app '${name}': 'env' must be an object`,
        "Environment variables should be key-value pairs"
      );
    }
  }

  // Optional: restart
  if ("restart" in appObj && appObj["restart"] !== undefined) {
    if (!VALID_RESTART_POLICIES.includes(appObj["restart"] as RestartPolicy)) {
      throw new ConfigError(
        `Invalid config for app '${name}': invalid 'restart' value`,
        `Valid values: ${VALID_RESTART_POLICIES.join(", ")}`
      );
    }
  }

  // Optional: restartSec
  if ("restartSec" in appObj && appObj["restartSec"] !== undefined) {
    if (typeof appObj["restartSec"] !== "number" || appObj["restartSec"] < 0) {
      throw new ConfigError(
        `Invalid config for app '${name}': 'restartSec' must be a non-negative number`,
        "Specify restart delay in seconds"
      );
    }
  }

  // Optional: user/group
  if ("user" in appObj && appObj["user"] !== undefined) {
    if (typeof appObj["user"] !== "string") {
      throw new ConfigError(
        `Invalid config for app '${name}': 'user' must be a string`,
        "Specify unix username to run as"
      );
    }
  }

  if ("group" in appObj && appObj["group"] !== undefined) {
    if (typeof appObj["group"] !== "string") {
      throw new ConfigError(
        `Invalid config for app '${name}': 'group' must be a string`,
        "Specify unix group to run as"
      );
    }
  }
}

/**
 * Validate defaults configuration
 */
function validateDefaults(defaults: unknown): void {
  if (typeof defaults !== "object" || defaults === null) {
    throw new ConfigError(
      "Invalid config: 'defaults' must be an object",
      "Defaults should contain partial app configuration"
    );
  }

  // Defaults can contain any AppConfig fields except cwd and command
  const defaultsObj = defaults as Record<string, unknown>;

  if ("cwd" in defaultsObj) {
    throw new ConfigError(
      "Invalid config: 'cwd' cannot be in defaults",
      "Each app must specify its own working directory"
    );
  }

  if ("command" in defaultsObj) {
    throw new ConfigError(
      "Invalid config: 'command' cannot be in defaults",
      "Each app must specify its own command"
    );
  }
}

/**
 * Validate systemd settings
 */
function validateSystemdSettings(settings: unknown): void {
  if (typeof settings !== "object" || settings === null) {
    throw new ConfigError(
      "Invalid config: 'systemd' must be an object",
      "Systemd settings should contain unit path or prefix options"
    );
  }

  const settingsObj = settings as Record<string, unknown>;

  if ("unitPath" in settingsObj && typeof settingsObj["unitPath"] !== "string") {
    throw new ConfigError(
      "Invalid config: 'systemd.unitPath' must be a string",
      "Specify path to systemd unit directory"
    );
  }

  if ("prefix" in settingsObj && typeof settingsObj["prefix"] !== "string") {
    throw new ConfigError(
      "Invalid config: 'systemd.prefix' must be a string",
      "Specify service name prefix (default: 'bunpm-')"
    );
  }

  if ("userMode" in settingsObj && typeof settingsObj["userMode"] !== "boolean") {
    throw new ConfigError(
      "Invalid config: 'systemd.userMode' must be a boolean",
      "Set to true to use user-level systemd"
    );
  }
}
