import { describe, test, expect } from "bun:test";
import { validateConfig } from "../../src/core/config/validator";
import { ConfigError } from "../../src/utils/errors";

describe("validateConfig", () => {
  describe("basic validation", () => {
    test("accepts valid minimal config", () => {
      const config = {
        apps: {
          api: {
            cwd: "/app",
            command: "bun run start",
          },
        },
      };
      expect(() => validateConfig(config)).not.toThrow();
    });

    test("accepts config with multiple apps", () => {
      const config = {
        apps: {
          api: { cwd: "/app/api", command: "bun run api" },
          worker: { cwd: "/app/worker", command: "bun run worker" },
          web: { cwd: "/app/web", command: "bun run web" },
        },
      };
      expect(() => validateConfig(config)).not.toThrow();
    });

    test("rejects null config", () => {
      expect(() => validateConfig(null)).toThrow(ConfigError);
    });

    test("rejects undefined config", () => {
      expect(() => validateConfig(undefined)).toThrow(ConfigError);
    });

    test("rejects non-object config", () => {
      expect(() => validateConfig("string")).toThrow(ConfigError);
      expect(() => validateConfig(123)).toThrow(ConfigError);
      expect(() => validateConfig([])).toThrow(ConfigError);
    });

    test("rejects config without apps", () => {
      expect(() => validateConfig({})).toThrow(ConfigError);
    });

    test("rejects config with null apps", () => {
      expect(() => validateConfig({ apps: null })).toThrow(ConfigError);
    });

    test("rejects config with empty apps object", () => {
      expect(() => validateConfig({ apps: {} })).toThrow(ConfigError);
    });
  });

  describe("app validation", () => {
    test("rejects app without cwd", () => {
      const config = {
        apps: {
          api: { command: "bun start" },
        },
      };
      expect(() => validateConfig(config)).toThrow(ConfigError);
    });

    test("rejects app without command", () => {
      const config = {
        apps: {
          api: { cwd: "/app" },
        },
      };
      expect(() => validateConfig(config)).toThrow(ConfigError);
    });

    test("rejects app with empty cwd", () => {
      const config = {
        apps: {
          api: { cwd: "", command: "bun start" },
        },
      };
      expect(() => validateConfig(config)).toThrow(ConfigError);
    });

    test("rejects app with empty command", () => {
      const config = {
        apps: {
          api: { cwd: "/app", command: "" },
        },
      };
      expect(() => validateConfig(config)).toThrow(ConfigError);
    });

    test("rejects app with non-string cwd", () => {
      const config = {
        apps: {
          api: { cwd: 123, command: "bun start" },
        },
      };
      expect(() => validateConfig(config)).toThrow(ConfigError);
    });

    test("rejects app with non-string command", () => {
      const config = {
        apps: {
          api: { cwd: "/app", command: 123 },
        },
      };
      expect(() => validateConfig(config)).toThrow(ConfigError);
    });

    test("rejects app that is not an object", () => {
      const config = {
        apps: {
          api: "not an object",
        },
      };
      expect(() => validateConfig(config)).toThrow(ConfigError);
    });
  });

  describe("optional field validation", () => {
    test("accepts valid restart policies", () => {
      const policies = ["always", "on-failure", "on-abnormal", "no"];

      for (const restart of policies) {
        const config = {
          apps: {
            api: { cwd: "/app", command: "bun start", restart },
          },
        };
        expect(() => validateConfig(config)).not.toThrow();
      }
    });

    test("rejects invalid restart policy", () => {
      const config = {
        apps: {
          api: { cwd: "/app", command: "bun start", restart: "invalid" },
        },
      };
      expect(() => validateConfig(config)).toThrow(ConfigError);
    });

    test("accepts valid restartSec", () => {
      const config = {
        apps: {
          api: { cwd: "/app", command: "bun start", restartSec: 5 },
        },
      };
      expect(() => validateConfig(config)).not.toThrow();
    });

    test("accepts zero restartSec", () => {
      const config = {
        apps: {
          api: { cwd: "/app", command: "bun start", restartSec: 0 },
        },
      };
      expect(() => validateConfig(config)).not.toThrow();
    });

    test("rejects negative restartSec", () => {
      const config = {
        apps: {
          api: { cwd: "/app", command: "bun start", restartSec: -1 },
        },
      };
      expect(() => validateConfig(config)).toThrow(ConfigError);
    });

    test("rejects non-number restartSec", () => {
      const config = {
        apps: {
          api: { cwd: "/app", command: "bun start", restartSec: "5" },
        },
      };
      expect(() => validateConfig(config)).toThrow(ConfigError);
    });

    test("accepts valid env object", () => {
      const config = {
        apps: {
          api: {
            cwd: "/app",
            command: "bun start",
            env: { NODE_ENV: "production", PORT: "3000" },
          },
        },
      };
      expect(() => validateConfig(config)).not.toThrow();
    });

    test("rejects non-object env", () => {
      const config = {
        apps: {
          api: { cwd: "/app", command: "bun start", env: "not an object" },
        },
      };
      expect(() => validateConfig(config)).toThrow(ConfigError);
    });

    test("accepts valid user and group", () => {
      const config = {
        apps: {
          api: {
            cwd: "/app",
            command: "bun start",
            user: "www-data",
            group: "www-data",
          },
        },
      };
      expect(() => validateConfig(config)).not.toThrow();
    });

    test("rejects non-string user", () => {
      const config = {
        apps: {
          api: { cwd: "/app", command: "bun start", user: 1000 },
        },
      };
      expect(() => validateConfig(config)).toThrow(ConfigError);
    });

    test("rejects non-string group", () => {
      const config = {
        apps: {
          api: { cwd: "/app", command: "bun start", group: 1000 },
        },
      };
      expect(() => validateConfig(config)).toThrow(ConfigError);
    });
  });

  describe("defaults validation", () => {
    test("accepts valid defaults", () => {
      const config = {
        apps: {
          api: { cwd: "/app", command: "bun start" },
        },
        defaults: {
          restart: "always",
          restartSec: 3,
        },
      };
      expect(() => validateConfig(config)).not.toThrow();
    });

    test("rejects cwd in defaults", () => {
      const config = {
        apps: { api: { cwd: "/app", command: "bun start" } },
        defaults: { cwd: "/default" },
      };
      expect(() => validateConfig(config)).toThrow(ConfigError);
    });

    test("rejects command in defaults", () => {
      const config = {
        apps: { api: { cwd: "/app", command: "bun start" } },
        defaults: { command: "npm start" },
      };
      expect(() => validateConfig(config)).toThrow(ConfigError);
    });

    test("rejects non-object defaults", () => {
      const config = {
        apps: { api: { cwd: "/app", command: "bun start" } },
        defaults: "not an object",
      };
      expect(() => validateConfig(config)).toThrow(ConfigError);
    });
  });

  describe("systemd settings validation", () => {
    test("accepts valid systemd settings", () => {
      const config = {
        apps: { api: { cwd: "/app", command: "bun start" } },
        systemd: {
          unitPath: "/etc/systemd/system",
          prefix: "myapp-",
          userMode: true,
        },
      };
      expect(() => validateConfig(config)).not.toThrow();
    });

    test("rejects non-string unitPath", () => {
      const config = {
        apps: { api: { cwd: "/app", command: "bun start" } },
        systemd: { unitPath: 123 },
      };
      expect(() => validateConfig(config)).toThrow(ConfigError);
    });

    test("rejects non-string prefix", () => {
      const config = {
        apps: { api: { cwd: "/app", command: "bun start" } },
        systemd: { prefix: 123 },
      };
      expect(() => validateConfig(config)).toThrow(ConfigError);
    });

    test("rejects non-boolean userMode", () => {
      const config = {
        apps: { api: { cwd: "/app", command: "bun start" } },
        systemd: { userMode: "true" },
      };
      expect(() => validateConfig(config)).toThrow(ConfigError);
    });

    test("rejects non-object systemd settings", () => {
      const config = {
        apps: { api: { cwd: "/app", command: "bun start" } },
        systemd: "not an object",
      };
      expect(() => validateConfig(config)).toThrow(ConfigError);
    });
  });
});
