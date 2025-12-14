import type { SystemdOperation } from "../../types/systemd";
import type { ServiceStatus, ServiceState } from "../../types/service";
import { SystemdError } from "../../utils/errors";
import { checkPermissions } from "../../utils/permissions";

/**
 * Controller for systemctl operations
 */
export class SystemdController {
  constructor(private userMode: boolean = false) {}

  /**
   * Execute a systemctl operation
   */
  async execute(
    operation: SystemdOperation,
    serviceName?: string
  ): Promise<void> {
    // Check permissions for write operations
    if (operation !== "status") {
      await checkPermissions(this.userMode);
    }

    const args = this.buildArgs(operation, serviceName);

    try {
      const proc = Bun.spawn(["systemctl", ...args], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const exitCode = await proc.exited;

      if (exitCode !== 0) {
        const stderr = await new Response(proc.stderr).text();
        throw new SystemdError(
          operation,
          serviceName ?? "daemon",
          stderr.trim()
        );
      }
    } catch (error) {
      if (error instanceof SystemdError) {
        throw error;
      }
      throw new SystemdError(
        operation,
        serviceName ?? "daemon",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  /**
   * Reload the systemd daemon
   */
  async daemonReload(): Promise<void> {
    await this.execute("daemon-reload");
  }

  /**
   * Start a service
   */
  async start(serviceName: string): Promise<void> {
    await this.execute("start", serviceName);
  }

  /**
   * Stop a service
   */
  async stop(serviceName: string): Promise<void> {
    await this.execute("stop", serviceName);
  }

  /**
   * Restart a service
   */
  async restart(serviceName: string): Promise<void> {
    await this.execute("restart", serviceName);
  }

  /**
   * Enable a service (start on boot)
   */
  async enable(serviceName: string): Promise<void> {
    await this.execute("enable", serviceName);
  }

  /**
   * Disable a service
   */
  async disable(serviceName: string): Promise<void> {
    await this.execute("disable", serviceName);
  }

  /**
   * Get the status of a service
   */
  async getStatus(serviceName: string): Promise<ServiceStatus> {
    const args = this.buildArgs("status", serviceName);
    args.push("--no-pager");

    try {
      const proc = Bun.spawn(["systemctl", ...args], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      return parseStatusOutput(serviceName, stdout);
    } catch {
      // Service not found or other error
      return {
        name: serviceName,
        state: "unknown",
      };
    }
  }

  /**
   * Get status of multiple services
   */
  async getAllStatuses(serviceNames: string[]): Promise<ServiceStatus[]> {
    return Promise.all(serviceNames.map((name) => this.getStatus(name)));
  }

  /**
   * Check if a service is active
   */
  async isActive(serviceName: string): Promise<boolean> {
    const args = this.buildArgs("is-active", serviceName);

    const proc = Bun.spawn(["systemctl", ...args], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await proc.exited;
    return exitCode === 0;
  }

  /**
   * Check if a service is enabled
   */
  async isEnabled(serviceName: string): Promise<boolean> {
    const args = this.buildArgs("is-enabled", serviceName);

    const proc = Bun.spawn(["systemctl", ...args], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await proc.exited;
    return exitCode === 0;
  }

  /**
   * Build systemctl arguments
   */
  private buildArgs(
    operation: SystemdOperation | "is-active" | "is-enabled",
    serviceName?: string
  ): string[] {
    const args: string[] = [];

    if (this.userMode) {
      args.push("--user");
    }

    args.push(operation);

    if (serviceName) {
      args.push(serviceName);
    }

    return args;
  }
}

/**
 * Parse systemctl status output into ServiceStatus
 */
function parseStatusOutput(serviceName: string, output: string): ServiceStatus {
  const lines = output.split("\n");

  // Default state
  let state: ServiceState = "unknown";
  let pid: number | undefined;
  let memory: number | undefined;
  let uptime: number | undefined;

  for (const line of lines) {
    const trimmed = line.trim();

    // Parse Active line: "Active: active (running) since ..."
    if (trimmed.startsWith("Active:")) {
      if (trimmed.includes("active (running)")) {
        state = "active";
      } else if (trimmed.includes("inactive")) {
        state = "inactive";
      } else if (trimmed.includes("failed")) {
        state = "failed";
      } else if (trimmed.includes("activating")) {
        state = "activating";
      } else if (trimmed.includes("deactivating")) {
        state = "deactivating";
      }

      // Parse uptime from "since ..." part
      const sinceMatch = trimmed.match(/since ([^;]+);/);
      if (sinceMatch?.[1]) {
        const since = new Date(sinceMatch[1]);
        if (!isNaN(since.getTime())) {
          uptime = Math.floor((Date.now() - since.getTime()) / 1000);
        }
      }
    }

    // Parse Main PID line: "Main PID: 12345 (bun)"
    if (trimmed.startsWith("Main PID:")) {
      const pidMatch = trimmed.match(/Main PID:\s*(\d+)/);
      if (pidMatch?.[1]) {
        pid = parseInt(pidMatch[1], 10);
      }
    }

    // Parse Memory line: "Memory: 45.2M"
    if (trimmed.startsWith("Memory:")) {
      const memMatch = trimmed.match(/Memory:\s*([\d.]+)([KMG])/);
      if (memMatch?.[1] && memMatch[2]) {
        const value = parseFloat(memMatch[1]);
        const unit = memMatch[2];

        switch (unit) {
          case "K":
            memory = value * 1024;
            break;
          case "M":
            memory = value * 1024 * 1024;
            break;
          case "G":
            memory = value * 1024 * 1024 * 1024;
            break;
          default:
            memory = value;
        }
      }
    }
  }

  return {
    name: serviceName,
    state,
    pid,
    memory,
    uptime,
  };
}
