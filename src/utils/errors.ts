/**
 * Base error class for bunman
 */
export class BunmanError extends Error {
  constructor(
    message: string,
    public help?: string,
    public exitCode: number = 1
  ) {
    super(message);
    this.name = "BunmanError";
  }
}

/**
 * Configuration-related errors
 */
export class ConfigError extends BunmanError {
  constructor(message: string, help?: string) {
    super(message, help, 1);
    this.name = "ConfigError";
  }
}

/**
 * Permission-related errors
 */
export class PermissionError extends BunmanError {
  constructor(operation: string) {
    super(
      `Permission denied for ${operation}`,
      "Try running with sudo or configure user-mode systemd",
      126
    );
    this.name = "PermissionError";
  }
}

/**
 * systemd-related errors
 */
export class SystemdError extends BunmanError {
  constructor(operation: string, serviceName: string, details?: string) {
    const message = `systemd ${operation} failed for ${serviceName}`;
    super(message, details, 1);
    this.name = "SystemdError";
  }
}

/**
 * Service not found error
 */
export class ServiceNotFoundError extends BunmanError {
  constructor(serviceName: string, availableServices: string[]) {
    const available =
      availableServices.length > 0
        ? `Available services: ${availableServices.join(", ")}`
        : "No services defined in config";
    super(`Service "${serviceName}" not found in config`, available, 1);
    this.name = "ServiceNotFoundError";
  }
}

/**
 * Command validation error
 */
export class CommandError extends BunmanError {
  constructor(message: string, usage?: string) {
    super(message, usage, 1);
    this.name = "CommandError";
  }
}
