import type { ServiceManager, LogOptions } from "../../types/backend";
import type { ServiceStatus, ServiceState } from "../../types/service";
import type { NormalizedAppConfig } from "../../types/config";
import { BunmanError } from "../../utils/errors";
import { existsSync } from "fs";
import { mkdir } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

/**
 * launchd backend implementation for macOS
 */
export class LaunchdBackend implements ServiceManager {
  private agentDir: string;
  private logDir: string;

  constructor() {
    this.agentDir = join(homedir(), "Library", "LaunchAgents");
    this.logDir = join(homedir(), ".bunman", "logs");
  }

  getName(): string {
    return "launchd";
  }

  async isAvailable(): Promise<boolean> {
    try {
      const proc = Bun.spawn(["launchctl", "version"], {
        stdout: "pipe",
        stderr: "pipe",
      });
      const exitCode = await proc.exited;
      return exitCode === 0;
    } catch {
      return false;
    }
  }

  async init(): Promise<void> {
    // Ensure LaunchAgents directory exists
    if (!existsSync(this.agentDir)) {
      await mkdir(this.agentDir, { recursive: true });
    }

    // Ensure log directory exists
    if (!existsSync(this.logDir)) {
      await mkdir(this.logDir, { recursive: true });
    }
  }

  async start(serviceName: string): Promise<void> {
    const plistPath = this.getPlistPath(serviceName);

    if (!existsSync(plistPath)) {
      throw new BunmanError(
        `Service ${serviceName} not found`,
        `Plist file does not exist: ${plistPath}`
      );
    }

    // Load the service
    const proc = Bun.spawn(["launchctl", "load", "-w", plistPath], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      throw new BunmanError(
        `Failed to start service ${serviceName}`,
        stderr.trim() || "launchctl load failed"
      );
    }
  }

  async stop(serviceName: string): Promise<void> {
    const plistPath = this.getPlistPath(serviceName);

    if (!existsSync(plistPath)) {
      throw new BunmanError(
        `Service ${serviceName} not found`,
        `Plist file does not exist: ${plistPath}`
      );
    }

    // Unload the service
    const proc = Bun.spawn(["launchctl", "unload", "-w", plistPath], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      // Ignore errors if service is not loaded
      if (!stderr.includes("Could not find specified service")) {
        throw new BunmanError(
          `Failed to stop service ${serviceName}`,
          stderr.trim() || "launchctl unload failed"
        );
      }
    }
  }

  async restart(serviceName: string): Promise<void> {
    // launchd doesn't have a native restart, so we unload and load
    await this.stop(serviceName);
    // Wait a bit for the service to fully stop
    await new Promise((resolve) => setTimeout(resolve, 500));
    await this.start(serviceName);
  }

  async getStatus(serviceName: string): Promise<ServiceStatus> {
    const label = this.getLabel(serviceName);

    try {
      // List all services and grep for ours
      const proc = Bun.spawn(["launchctl", "list"], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      return this.parseListOutput(serviceName, label, stdout);
    } catch {
      return {
        name: serviceName,
        state: "unknown",
      };
    }
  }

  async getAllStatuses(serviceNames: string[]): Promise<ServiceStatus[]> {
    return Promise.all(serviceNames.map((name) => this.getStatus(name)));
  }

  async isActive(serviceName: string): Promise<boolean> {
    const status = await this.getStatus(serviceName);
    return status.state === "active";
  }

  async logs(serviceName: string, options: LogOptions): Promise<void> {
    const logFile = join(this.logDir, `${serviceName}.log`);

    if (!existsSync(logFile)) {
      throw new BunmanError(
        `Log file not found for ${serviceName}`,
        `Expected log file at: ${logFile}`
      );
    }

    // Build tail command
    const args = ["-f"];

    if (options.lines) {
      args.push("-n", options.lines.toString());
    }

    args.push(logFile);

    // Use tail to follow the log
    const proc = Bun.spawn(["tail", ...args], {
      stdout: "inherit",
      stderr: "inherit",
      stdin: "inherit",
    });

    await proc.exited;
  }

  generateConfig(serviceName: string, app: NormalizedAppConfig): string {
    const label = this.getLabel(serviceName);
    const logFile = join(this.logDir, `${serviceName}.log`);
    const errorLogFile = join(this.logDir, `${serviceName}.error.log`);

    // Parse command into program and arguments
    const commandParts = this.parseCommand(app.command);

    // Build plist structure
    const plist: any = {
      Label: label,
      ProgramArguments: commandParts,
      WorkingDirectory: app.cwd,
      RunAtLoad: true,
      StandardOutPath: logFile,
      StandardErrorPath: errorLogFile,
    };

    // Add environment variables
    if (Object.keys(app.env).length > 0) {
      plist.EnvironmentVariables = app.env;
    }

    // Add KeepAlive based on restart policy
    if (app.restart === "always") {
      plist.KeepAlive = true;
    } else if (app.restart === "on-failure") {
      plist.KeepAlive = {
        SuccessfulExit: false,
      };
    }

    // Add resource limits if specified
    if (app.limits.memory) {
      // Convert MB to bytes
      plist.HardResourceLimits = plist.HardResourceLimits || {};
      plist.HardResourceLimits.MemoryLimit = app.limits.memory * 1024 * 1024;
    }

    if (app.limits.nofile) {
      plist.HardResourceLimits = plist.HardResourceLimits || {};
      plist.HardResourceLimits.NumberOfFiles = app.limits.nofile;
    }

    // Add user if specified
    if (app.user) {
      plist.UserName = app.user;
    }

    if (app.group) {
      plist.GroupName = app.group;
    }

    return this.serializePlist(plist);
  }

  async install(serviceName: string, app: NormalizedAppConfig): Promise<void> {
    // Ensure directories exist
    await this.init();

    // Generate plist content
    const plistContent = this.generateConfig(serviceName, app);

    // Write plist file
    const plistPath = this.getPlistPath(serviceName);
    await Bun.write(plistPath, plistContent);

    // Load the service
    await this.start(serviceName);
  }

  async remove(serviceName: string): Promise<void> {
    const plistPath = this.getPlistPath(serviceName);

    // Stop service if running
    try {
      await this.stop(serviceName);
    } catch {
      // Service might not be running, that's okay
    }

    // Remove plist file
    if (existsSync(plistPath)) {
      try {
        await Bun.$`rm ${plistPath}`;
      } catch {
        throw new BunmanError(
          "Failed to remove plist file",
          `Could not delete ${plistPath}`
        );
      }
    }
  }

  async reload(): Promise<void> {
    // launchd doesn't have a daemon-reload equivalent
    // Changes are picked up automatically
  }

  async enable(serviceName: string): Promise<void> {
    // On launchd, services are enabled when loaded with -w flag
    // This is handled in the start() method
  }

  async disable(serviceName: string): Promise<void> {
    // On launchd, services are disabled when unloaded with -w flag
    // This is handled in the stop() method
  }

  /**
   * Get the launchd label for a service
   */
  private getLabel(serviceName: string): string {
    return `com.bunman.${serviceName}`;
  }

  /**
   * Get the plist file path for a service
   */
  private getPlistPath(serviceName: string): string {
    const label = this.getLabel(serviceName);
    return join(this.agentDir, `${label}.plist`);
  }

  /**
   * Parse a command string into program and arguments array
   */
  private parseCommand(command: string): string[] {
    // Simple parsing - split by spaces but respect quotes
    const parts: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < command.length; i++) {
      const char = command[i];

      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === " " && !inQuotes) {
        if (current) {
          parts.push(current);
          current = "";
        }
      } else {
        current += char;
      }
    }

    if (current) {
      parts.push(current);
    }

    return parts;
  }

  /**
   * Serialize an object to plist XML format
   */
  private serializePlist(obj: any): string {
    const lines: string[] = [];

    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push(
      '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">'
    );
    lines.push('<plist version="1.0">');
    lines.push("<dict>");

    for (const [key, value] of Object.entries(obj)) {
      lines.push(`\t<key>${key}</key>`);
      lines.push(this.serializePlistValue(value, 1));
    }

    lines.push("</dict>");
    lines.push("</plist>");

    return lines.join("\n") + "\n";
  }

  /**
   * Serialize a value to plist XML format
   */
  private serializePlistValue(value: any, indent: number = 0): string {
    const tabs = "\t".repeat(indent);

    if (typeof value === "string") {
      return `${tabs}<string>${this.escapeXml(value)}</string>`;
    }

    if (typeof value === "number") {
      return `${tabs}<integer>${value}</integer>`;
    }

    if (typeof value === "boolean") {
      return `${tabs}<${value ? "true" : "false"}/>`;
    }

    if (Array.isArray(value)) {
      const lines = [`${tabs}<array>`];
      for (const item of value) {
        lines.push(this.serializePlistValue(item, indent + 1));
      }
      lines.push(`${tabs}</array>`);
      return lines.join("\n");
    }

    if (typeof value === "object" && value !== null) {
      const lines = [`${tabs}<dict>`];
      for (const [key, val] of Object.entries(value)) {
        lines.push(`${tabs}\t<key>${key}</key>`);
        lines.push(this.serializePlistValue(val, indent + 1));
      }
      lines.push(`${tabs}</dict>`);
      return lines.join("\n");
    }

    return `${tabs}<string></string>`;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  /**
   * Parse launchctl list output to get service status
   */
  private parseListOutput(
    serviceName: string,
    label: string,
    output: string
  ): ServiceStatus {
    const lines = output.split("\n");

    for (const line of lines) {
      if (line.includes(label)) {
        const parts = line.trim().split(/\s+/);

        // launchctl list output format:
        // PID    Status    Label
        // 12345  0         com.bunman.api
        // -      0         com.bunman.stopped

        const pid = parts[0] === "-" ? undefined : parseInt(parts[0], 10);
        const statusCode = parseInt(parts[1], 10);

        let state: ServiceState;
        if (pid !== undefined && !isNaN(pid)) {
          state = "active";
        } else if (statusCode === 0) {
          state = "inactive";
        } else {
          state = "failed";
        }

        return {
          name: serviceName,
          state,
          pid,
        };
      }
    }

    // Service not found in list
    return {
      name: serviceName,
      state: "inactive",
    };
  }
}

