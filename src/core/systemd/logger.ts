import type { LogOptions } from "../../types/backend";
import { SystemdError } from "../../utils/errors";

/**
 * Logger for journalctl log retrieval
 */
export class SystemdLogger {
  constructor(private userMode: boolean = false) {}

  /**
   * Get logs for a service
   */
  async follow(serviceName: string, options: LogOptions = {}): Promise<void> {
    const args = this.buildArgs(serviceName, options);

    try {
      if (options.follow) {
        // Stream logs using spawn with piped output
        await this.streamLogs(args);
      } else {
        // Get snapshot of logs
        await this.printLogs(args);
      }
    } catch (error) {
      if (error instanceof SystemdError) {
        throw error;
      }
      throw new SystemdError(
        "logs",
        serviceName,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  /**
   * Stream logs continuously (--follow mode)
   */
  private async streamLogs(args: string[]): Promise<void> {
    const proc = Bun.spawn(["journalctl", ...args], {
      stdout: "pipe",
      stderr: "pipe",
    });

    // Stream stdout to console
    const reader = proc.stdout.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        // Write chunk directly to stdout
        process.stdout.write(value);
      }
    } catch (error) {
      // Handle SIGINT gracefully (user pressed Ctrl+C)
      if (
        error instanceof Error &&
        error.message.includes("The operation was aborted")
      ) {
        return;
      }
      throw error;
    } finally {
      reader.releaseLock();
      proc.kill();
    }
  }

  /**
   * Print logs snapshot (non-follow mode)
   */
  private async printLogs(args: string[]): Promise<void> {
    const proc = Bun.spawn(["journalctl", ...args], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    if (exitCode !== 0 && stdout.length === 0) {
      const stderr = await new Response(proc.stderr).text();
      throw new SystemdError("logs", "service", stderr.trim());
    }

    if (stdout.trim()) {
      console.log(stdout);
    }
  }

  /**
   * Build journalctl arguments
   */
  private buildArgs(serviceName: string, options: LogOptions): string[] {
    const args: string[] = [];

    // User mode
    if (this.userMode) {
      args.push("--user");
    }

    // Service filter
    args.push("-u", serviceName);

    // Follow mode
    if (options.follow) {
      args.push("-f");
    }

    // Number of lines
    if (options.lines !== undefined) {
      args.push("-n", options.lines.toString());
    }

    // Time range - since
    if (options.since) {
      args.push("--since", options.since);
    }

    // No pager
    args.push("--no-pager");

    return args;
  }

  /**
   * Get the number of lines available in the journal
   */
  async getLogCount(serviceName: string): Promise<number> {
    const args: string[] = [];

    if (this.userMode) {
      args.push("--user");
    }

    args.push("-u", serviceName, "--no-pager", "-o", "short");

    const proc = Bun.spawn(["journalctl", ...args], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const stdout = await new Response(proc.stdout).text();
    await proc.exited;

    // Count non-empty lines
    const lines = stdout.split("\n").filter((line) => line.trim().length > 0);
    return lines.length;
  }
}
