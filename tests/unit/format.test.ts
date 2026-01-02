import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { formatBytes, formatDuration, formatStatusTable, formatServiceDetail } from "../../src/utils/format";
import type { ServiceStatus } from "../../src/types/service";

describe("formatBytes", () => {
  test("formats 0 bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  test("formats bytes under 1KB", () => {
    expect(formatBytes(500)).toBe("500.0 B");
    expect(formatBytes(1)).toBe("1.0 B");
    expect(formatBytes(1023)).toBe("1023.0 B");
  });

  test("formats kilobytes", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(2048)).toBe("2.0 KB");
  });

  test("formats megabytes", () => {
    expect(formatBytes(1048576)).toBe("1.0 MB");
    expect(formatBytes(1572864)).toBe("1.5 MB");
    expect(formatBytes(10485760)).toBe("10.0 MB");
  });

  test("formats gigabytes", () => {
    expect(formatBytes(1073741824)).toBe("1.0 GB");
    expect(formatBytes(2147483648)).toBe("2.0 GB");
  });

  test("formats terabytes", () => {
    expect(formatBytes(1099511627776)).toBe("1.0 TB");
  });

  test("handles decimal precision", () => {
    // 1.5 KB = 1536 bytes
    expect(formatBytes(1536)).toBe("1.5 KB");
    // 2.25 MB
    expect(formatBytes(2359296)).toBe("2.3 MB");
  });
});

describe("formatDuration", () => {
  test("formats seconds only", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(1)).toBe("1s");
    expect(formatDuration(30)).toBe("30s");
    expect(formatDuration(59)).toBe("59s");
  });

  test("formats minutes and seconds", () => {
    expect(formatDuration(60)).toBe("1m 0s");
    expect(formatDuration(90)).toBe("1m 30s");
    expect(formatDuration(125)).toBe("2m 5s");
    expect(formatDuration(3599)).toBe("59m 59s");
  });

  test("formats hours and minutes", () => {
    expect(formatDuration(3600)).toBe("1h 0m");
    expect(formatDuration(5400)).toBe("1h 30m");
    expect(formatDuration(7200)).toBe("2h 0m");
    expect(formatDuration(86399)).toBe("23h 59m");
  });

  test("formats days and hours", () => {
    expect(formatDuration(86400)).toBe("1d 0h");
    expect(formatDuration(90000)).toBe("1d 1h");
    expect(formatDuration(172800)).toBe("2d 0h");
    expect(formatDuration(259200)).toBe("3d 0h");
  });

  test("handles large durations", () => {
    // 7 days
    expect(formatDuration(604800)).toBe("7d 0h");
    // 30 days
    expect(formatDuration(2592000)).toBe("30d 0h");
  });

  test("handles edge cases at boundaries", () => {
    // Just under 1 minute
    expect(formatDuration(59)).toBe("59s");
    // Exactly 1 minute
    expect(formatDuration(60)).toBe("1m 0s");
    // Just under 1 hour
    expect(formatDuration(3599)).toBe("59m 59s");
    // Exactly 1 hour
    expect(formatDuration(3600)).toBe("1h 0m");
    // Just under 1 day
    expect(formatDuration(86399)).toBe("23h 59m");
    // Exactly 1 day
    expect(formatDuration(86400)).toBe("1d 0h");
  });
});

describe("formatStatusTable", () => {
  let originalNoColor: string | undefined;
  let originalForceColor: string | undefined;

  beforeEach(() => {
    originalNoColor = process.env["NO_COLOR"];
    originalForceColor = process.env["FORCE_COLOR"];
    delete process.env["NO_COLOR"];
    delete process.env["FORCE_COLOR"];
  });

  afterEach(() => {
    if (originalNoColor !== undefined) {
      process.env["NO_COLOR"] = originalNoColor;
    } else {
      delete process.env["NO_COLOR"];
    }
    if (originalForceColor !== undefined) {
      process.env["FORCE_COLOR"] = originalForceColor;
    } else {
      delete process.env["FORCE_COLOR"];
    }
  });

  test("handles empty array", () => {
    const result = formatStatusTable([]);
    expect(result).toContain("No services configured");
  });

  test("formats single active service with all fields", () => {
    const statuses: ServiceStatus[] = [{
      name: "test-service",
      state: "active",
      pid: 12345,
      memory: 52428800, // 50 MB
      uptime: 3665, // 1h 1m 5s
    }];

    const result = formatStatusTable(statuses);
    expect(result).toContain("Service");
    expect(result).toContain("Status");
    expect(result).toContain("PID");
    expect(result).toContain("Memory");
    expect(result).toContain("Uptime");
    expect(result).toContain("test-service");
    expect(result).toContain("12345");
    expect(result).toContain("50.0 MB");
    expect(result).toContain("1h 1m");
  });

  test("formats multiple services with different states", () => {
    const statuses: ServiceStatus[] = [
      { name: "service-1", state: "active", pid: 100, memory: 1024, uptime: 60 },
      { name: "service-2", state: "inactive" },
      { name: "service-3", state: "failed", exitCode: 1, error: "Crashed" },
      { name: "service-4", state: "activating" },
      { name: "service-5", state: "deactivating" },
    ];

    const result = formatStatusTable(statuses);
    expect(result).toContain("service-1");
    expect(result).toContain("service-2");
    expect(result).toContain("service-3");
    expect(result).toContain("service-4");
    expect(result).toContain("service-5");
    expect(result).toContain("100");
    expect(result).toContain("1.0 KB");
    expect(result).toContain("1m 0s");
  });

  test("handles services with missing optional fields", () => {
    const statuses: ServiceStatus[] = [
      { name: "minimal", state: "active" },
      { name: "no-memory", state: "active", pid: 999, uptime: 120 },
    ];

    const result = formatStatusTable(statuses);
    expect(result).toContain("minimal");
    expect(result).toContain("no-memory");
    expect(result).toContain("999");
    // Should contain dashes for missing fields
    const lines = result.split("\n");
    expect(lines.some(line => line.includes("-"))).toBe(true);
  });

  test("works with NO_COLOR environment variable", () => {
    process.env["NO_COLOR"] = "1";

    const statuses: ServiceStatus[] = [{
      name: "test",
      state: "active",
      pid: 123,
      memory: 1024,
      uptime: 60,
    }];

    const result = formatStatusTable(statuses);
    // Result should not contain ANSI escape codes
    expect(result).not.toMatch(/\x1b\[[0-9;]*m/);
    expect(result).toContain("test");
    expect(result).toContain("123");
  });
});

describe("formatServiceDetail", () => {
  let originalNoColor: string | undefined;
  let originalForceColor: string | undefined;

  beforeEach(() => {
    originalNoColor = process.env["NO_COLOR"];
    originalForceColor = process.env["FORCE_COLOR"];
    delete process.env["NO_COLOR"];
    delete process.env["FORCE_COLOR"];
  });

  afterEach(() => {
    if (originalNoColor !== undefined) {
      process.env["NO_COLOR"] = originalNoColor;
    } else {
      delete process.env["NO_COLOR"];
    }
    if (originalForceColor !== undefined) {
      process.env["FORCE_COLOR"] = originalForceColor;
    } else {
      delete process.env["FORCE_COLOR"];
    }
  });

  test("formats active service with all fields", () => {
    const status: ServiceStatus = {
      name: "my-service",
      state: "active",
      pid: 54321,
      memory: 104857600, // 100 MB
      uptime: 7265, // 2h 1m 5s
      restarts: 3,
    };

    const result = formatServiceDetail(status);
    expect(result).toContain("my-service");
    expect(result).toContain("State:");
    expect(result).toContain("PID: 54321");
    expect(result).toContain("Memory: 100.0 MB");
    expect(result).toContain("Uptime: 2h 1m");
    expect(result).toContain("Restarts: 3");
  });

  test("formats inactive service", () => {
    const status: ServiceStatus = {
      name: "stopped-service",
      state: "inactive",
    };

    const result = formatServiceDetail(status);
    expect(result).toContain("stopped-service");
    expect(result).toContain("State:");
    expect(result).not.toContain("PID:");
    expect(result).not.toContain("Memory:");
    expect(result).not.toContain("Uptime:");
  });

  test("formats failed service with error", () => {
    const status: ServiceStatus = {
      name: "failed-service",
      state: "failed",
      exitCode: 127,
      error: "Command not found",
      restarts: 5,
    };

    const result = formatServiceDetail(status);
    expect(result).toContain("failed-service");
    expect(result).toContain("Exit Code: 127");
    expect(result).toContain("Error: Command not found");
    expect(result).toContain("Restarts: 5");
  });

  test("formats activating service", () => {
    const status: ServiceStatus = {
      name: "starting-service",
      state: "activating",
    };

    const result = formatServiceDetail(status);
    expect(result).toContain("starting-service");
    expect(result).toContain("State:");
  });

  test("formats deactivating service", () => {
    const status: ServiceStatus = {
      name: "stopping-service",
      state: "deactivating",
      pid: 999,
    };

    const result = formatServiceDetail(status);
    expect(result).toContain("stopping-service");
    expect(result).toContain("PID: 999");
  });

  test("formats unknown state service", () => {
    const status: ServiceStatus = {
      name: "unknown-service",
      state: "unknown",
    };

    const result = formatServiceDetail(status);
    expect(result).toContain("unknown-service");
    expect(result).toContain("State:");
  });

  test("does not show restarts when 0", () => {
    const status: ServiceStatus = {
      name: "test",
      state: "active",
      restarts: 0,
    };

    const result = formatServiceDetail(status);
    expect(result).not.toContain("Restarts:");
  });

  test("shows exit code 0", () => {
    const status: ServiceStatus = {
      name: "test",
      state: "inactive",
      exitCode: 0,
    };

    const result = formatServiceDetail(status);
    expect(result).toContain("Exit Code: 0");
  });

  test("works with NO_COLOR environment variable", () => {
    process.env["NO_COLOR"] = "1";

    const status: ServiceStatus = {
      name: "test",
      state: "active",
      pid: 123,
    };

    const result = formatServiceDetail(status);
    // Result should not contain ANSI escape codes
    expect(result).not.toMatch(/\x1b\[[0-9;]*m/);
    expect(result).toContain("test");
    expect(result).toContain("123");
  });
});
