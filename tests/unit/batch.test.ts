import { describe, test, expect, mock, beforeEach } from "bun:test";
import { validateServiceNames, executeBatch } from "../../src/core/batch";
import type { BatchOperationOptions } from "../../src/core/batch";
import { ServiceNotFoundError } from "../../src/utils/errors";
import type { ServiceManager } from "../../src/types/backend";
import type { NormalizedAppConfig } from "../../src/types/config";
import type { ServiceStatus } from "../../src/types/service";

// Create a mock service manager
function createMockServiceManager(overrides?: Partial<ServiceManager>): ServiceManager {
  return {
    init: mock(() => Promise.resolve()),
    start: mock(() => Promise.resolve()),
    stop: mock(() => Promise.resolve()),
    restart: mock(() => Promise.resolve()),
    getStatus: mock(() =>
      Promise.resolve({
        name: "test",
        state: "active" as const,
      } as ServiceStatus)
    ),
    getAllStatuses: mock(() => Promise.resolve([])),
    isActive: mock(() => Promise.resolve(true)),
    logs: mock(() => Promise.resolve()),
    generateConfig: mock(() => ""),
    install: mock(() => Promise.resolve()),
    remove: mock(() => Promise.resolve()),
    reload: mock(() => Promise.resolve()),
    enable: mock(() => Promise.resolve()),
    disable: mock(() => Promise.resolve()),
    isAvailable: mock(() => Promise.resolve(true)),
    getName: () => "mock",
    ...overrides,
  };
}

// Create a mock app config
function createMockApp(name: string): NormalizedAppConfig {
  return {
    serviceName: `bunman-${name}`,
    cwd: `/app/${name}`,
    command: "bun run start",
    env: {},
    description: `Test ${name} service`,
    restart: "always",
    restartSec: 3,
    after: ["network.target"],
    requires: [],
    limits: {},
  };
}

describe("validateServiceNames", () => {
  const apps: Record<string, NormalizedAppConfig> = {
    api: createMockApp("api"),
    worker: createMockApp("worker"),
    web: createMockApp("web"),
  };

  test("passes for valid service names", () => {
    expect(() => validateServiceNames(["api", "worker"], apps)).not.toThrow();
  });

  test("passes for single valid name", () => {
    expect(() => validateServiceNames(["api"], apps)).not.toThrow();
  });

  test("passes for all valid names", () => {
    expect(() => validateServiceNames(["api", "worker", "web"], apps)).not.toThrow();
  });

  test("throws for single invalid service name", () => {
    expect(() => validateServiceNames(["invalid"], apps)).toThrow(
      ServiceNotFoundError
    );
  });

  test("throws for invalid name in list", () => {
    expect(() => validateServiceNames(["api", "invalid"], apps)).toThrow(
      ServiceNotFoundError
    );
  });

  test("throws with first invalid name", () => {
    try {
      validateServiceNames(["invalid1", "invalid2"], apps);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceNotFoundError);
      expect((error as ServiceNotFoundError).message).toContain("invalid1");
    }
  });

  test("passes for empty array", () => {
    expect(() => validateServiceNames([], apps)).not.toThrow();
  });
});

describe("executeBatch", () => {
  let mockServiceManager: ServiceManager;

  beforeEach(() => {
    mockServiceManager = createMockServiceManager();
  });

  test("executes operation on all services", async () => {
    const services: Array<[string, NormalizedAppConfig]> = [
      ["api", createMockApp("api")],
      ["worker", createMockApp("worker")],
    ];

    const executeFn = mock(() => Promise.resolve());

    const result = await executeBatch(services, mockServiceManager, {
      presentVerb: "Starting",
      pastVerb: "started",
      execute: executeFn,
    });

    expect(executeFn).toHaveBeenCalledTimes(2);
    expect(result.total).toBe(2);
    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(0);
  });

  test("handles execution failures", async () => {
    const services: Array<[string, NormalizedAppConfig]> = [
      ["api", createMockApp("api")],
    ];

    const result = await executeBatch(services, mockServiceManager, {
      presentVerb: "Starting",
      pastVerb: "started",
      execute: async () => {
        throw new Error("Connection failed");
      },
    });

    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.results[0]!.error).toBe("Connection failed");
  });

  test("skips services when shouldSkip returns true", async () => {
    const services: Array<[string, NormalizedAppConfig]> = [
      ["api", createMockApp("api")],
      ["worker", createMockApp("worker")],
    ];

    const executeFn = mock(() => Promise.resolve());
    let skipCount = 0;

    const result = await executeBatch(services, mockServiceManager, {
      presentVerb: "Stopping",
      pastVerb: "stopped",
      execute: executeFn,
      shouldSkip: async (name) => {
        // Skip the first service
        return skipCount++ === 0;
      },
      skipMessage: "already stopped",
    });

    expect(executeFn).toHaveBeenCalledTimes(1); // Only called for non-skipped
    expect(result.skipped).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(result.results[0]!.skipped).toBe(true);
    expect(result.results[1]!.skipped).toBe(false);
  });

  test("reports failure when verification fails", async () => {
    const failingServiceManager = createMockServiceManager({
      getStatus: mock(() =>
        Promise.resolve({
          name: "test",
          state: "failed" as const,
        } as ServiceStatus)
      ),
    });

    const services: Array<[string, NormalizedAppConfig]> = [
      ["api", createMockApp("api")],
    ];

    const result = await executeBatch(services, failingServiceManager, {
      presentVerb: "Starting",
      pastVerb: "started",
      execute: async () => {},
      successStates: ["active", "activating"],
    });

    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.results[0]!.success).toBe(false);
  });

  test("uses custom success states", async () => {
    const stoppedServiceManager = createMockServiceManager({
      getStatus: mock(() =>
        Promise.resolve({
          name: "test",
          state: "inactive" as const,
        } as ServiceStatus)
      ),
    });

    const services: Array<[string, NormalizedAppConfig]> = [
      ["api", createMockApp("api")],
    ];

    const result = await executeBatch(services, stoppedServiceManager, {
      presentVerb: "Stopping",
      pastVerb: "stopped",
      execute: async () => {},
      successStates: ["inactive", "deactivating"],
    });

    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);
  });

  test("handles empty services array", async () => {
    const services: Array<[string, NormalizedAppConfig]> = [];

    const result = await executeBatch(services, mockServiceManager, {
      presentVerb: "Starting",
      pastVerb: "started",
      execute: async () => {},
    });

    expect(result.total).toBe(0);
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(0);
  });

  test("provides correct results for each service", async () => {
    const services: Array<[string, NormalizedAppConfig]> = [
      ["api", createMockApp("api")],
      ["worker", createMockApp("worker")],
      ["web", createMockApp("web")],
    ];

    const result = await executeBatch(services, mockServiceManager, {
      presentVerb: "Starting",
      pastVerb: "started",
      execute: async () => {},
    });

    expect(result.results).toHaveLength(3);
    expect(result.results[0]!.name).toBe("api");
    expect(result.results[1]!.name).toBe("worker");
    expect(result.results[2]!.name).toBe("web");
  });

  test("passes correct arguments to execute function", async () => {
    const api = createMockApp("api");
    const services: Array<[string, NormalizedAppConfig]> = [["api", api]];

    const executeFn = mock(
      (name: string, app: NormalizedAppConfig, sm: ServiceManager) => {
        expect(name).toBe("api");
        expect(app).toBe(api);
        expect(sm).toBe(mockServiceManager);
        return Promise.resolve();
      }
    );

    await executeBatch(services, mockServiceManager, {
      presentVerb: "Starting",
      pastVerb: "started",
      execute: executeFn,
    });

    expect(executeFn).toHaveBeenCalled();
  });

  test("handles mixed success and failure", async () => {
    const services: Array<[string, NormalizedAppConfig]> = [
      ["api", createMockApp("api")],
      ["worker", createMockApp("worker")],
      ["web", createMockApp("web")],
    ];

    let callCount = 0;

    const result = await executeBatch(services, mockServiceManager, {
      presentVerb: "Starting",
      pastVerb: "started",
      execute: async () => {
        callCount++;
        if (callCount === 2) {
          throw new Error("Worker failed");
        }
      },
    });

    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.results[1]!.success).toBe(false);
    expect(result.results[1]!.error).toBe("Worker failed");
  });
});
