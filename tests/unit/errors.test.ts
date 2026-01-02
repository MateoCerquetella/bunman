import { describe, test, expect } from "bun:test";
import {
  BunmanError,
  ConfigError,
  PermissionError,
  SystemdError,
  ServiceNotFoundError,
  CommandError,
} from "../../src/utils/errors";

describe("BunmanError", () => {
  test("creates error with message only", () => {
    const error = new BunmanError("test message");
    expect(error.message).toBe("test message");
    expect(error.name).toBe("BunmanError");
    expect(error.help).toBeUndefined();
    expect(error.exitCode).toBe(1);
  });

  test("creates error with help text", () => {
    const error = new BunmanError("test message", "try this");
    expect(error.message).toBe("test message");
    expect(error.help).toBe("try this");
    expect(error.exitCode).toBe(1);
  });

  test("creates error with custom exit code", () => {
    const error = new BunmanError("test", "help", 2);
    expect(error.exitCode).toBe(2);
  });

  test("is instance of Error", () => {
    const error = new BunmanError("test");
    expect(error).toBeInstanceOf(Error);
  });
});

describe("ConfigError", () => {
  test("creates error with correct name", () => {
    const error = new ConfigError("config issue");
    expect(error.name).toBe("ConfigError");
    expect(error.message).toBe("config issue");
  });

  test("creates error with help text", () => {
    const error = new ConfigError("invalid config", "check your config file");
    expect(error.help).toBe("check your config file");
  });

  test("has default exit code 1", () => {
    const error = new ConfigError("error");
    expect(error.exitCode).toBe(1);
  });

  test("is instance of BunmanError", () => {
    const error = new ConfigError("test");
    expect(error).toBeInstanceOf(BunmanError);
  });
});

describe("PermissionError", () => {
  test("formats permission message correctly", () => {
    const error = new PermissionError("write to /etc");
    expect(error.message).toBe("Permission denied for write to /etc");
    expect(error.name).toBe("PermissionError");
  });

  test("has exit code 126", () => {
    const error = new PermissionError("read file");
    expect(error.exitCode).toBe(126);
  });

  test("provides sudo hint in help", () => {
    const error = new PermissionError("operation");
    expect(error.help).toContain("sudo");
  });

  test("is instance of BunmanError", () => {
    const error = new PermissionError("test");
    expect(error).toBeInstanceOf(BunmanError);
  });
});

describe("SystemdError", () => {
  test("formats systemd error message", () => {
    const error = new SystemdError("start", "my-service", "unit not found");
    expect(error.message).toBe("systemd start failed for my-service");
    expect(error.name).toBe("SystemdError");
  });

  test("includes details in help text", () => {
    const error = new SystemdError("stop", "api-service", "service not loaded");
    expect(error.help).toBe("service not loaded");
  });

  test("handles missing details", () => {
    const error = new SystemdError("restart", "worker");
    expect(error.message).toBe("systemd restart failed for worker");
    expect(error.help).toBeUndefined();
  });

  test("is instance of BunmanError", () => {
    const error = new SystemdError("start", "test");
    expect(error).toBeInstanceOf(BunmanError);
  });
});

describe("ServiceNotFoundError", () => {
  test("formats error message with service name", () => {
    const error = new ServiceNotFoundError("api", ["web", "worker"]);
    expect(error.message).toBe('Service "api" not found in config');
    expect(error.name).toBe("ServiceNotFoundError");
  });

  test("lists available services in help", () => {
    const error = new ServiceNotFoundError("missing", ["api", "web", "worker"]);
    expect(error.help).toBe("Available services: api, web, worker");
  });

  test("shows no services message when empty", () => {
    const error = new ServiceNotFoundError("api", []);
    expect(error.help).toBe("No services defined in config");
  });

  test("handles single available service", () => {
    const error = new ServiceNotFoundError("wrong", ["correct"]);
    expect(error.help).toBe("Available services: correct");
  });

  test("is instance of BunmanError", () => {
    const error = new ServiceNotFoundError("test", []);
    expect(error).toBeInstanceOf(BunmanError);
  });
});

describe("CommandError", () => {
  test("creates error with message", () => {
    const error = new CommandError("bad input");
    expect(error.message).toBe("bad input");
    expect(error.name).toBe("CommandError");
  });

  test("creates error with usage info", () => {
    const error = new CommandError("missing argument", "Usage: bunman start <service>");
    expect(error.help).toBe("Usage: bunman start <service>");
  });

  test("has exit code 1", () => {
    const error = new CommandError("error");
    expect(error.exitCode).toBe(1);
  });

  test("is instance of BunmanError", () => {
    const error = new CommandError("test");
    expect(error).toBeInstanceOf(BunmanError);
  });
});
