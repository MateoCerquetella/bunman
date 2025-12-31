import type { ServiceManager, LogOptions } from "../../types/backend";
import type { ServiceStatus } from "../../types/service";
import type { NormalizedAppConfig } from "../../types/config";
import { SystemdController } from "../systemd/controller";
import { SystemdLogger } from "../systemd/logger";
import { generateUnitFile } from "../systemd/generator";
import {
  getUnitFilePath,
  ensureUnitDirectory,
  unitFileExists,
} from "../systemd/paths";
import { checkPermissions } from "../../utils/permissions";
import { BunmanError } from "../../utils/errors";

/**
 * Systemd backend implementation for Linux
 */
export class SystemdBackend implements ServiceManager {
  private controller: SystemdController;
  private logger: SystemdLogger;
  private userMode: boolean;

  constructor(userMode: boolean = true) {
    this.userMode = userMode;
    this.controller = new SystemdController(userMode);
    this.logger = new SystemdLogger(userMode);
  }

  getName(): string {
    return "systemd";
  }

  async isAvailable(): Promise<boolean> {
    try {
      const proc = Bun.spawn(["systemctl", "--version"], {
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
    await ensureUnitDirectory(this.userMode);
  }

  async start(serviceName: string): Promise<void> {
    await this.controller.start(serviceName);
  }

  async stop(serviceName: string): Promise<void> {
    await this.controller.stop(serviceName);
  }

  async restart(serviceName: string): Promise<void> {
    await this.controller.restart(serviceName);
  }

  async getStatus(serviceName: string): Promise<ServiceStatus> {
    return await this.controller.getStatus(serviceName);
  }

  async getAllStatuses(serviceNames: string[]): Promise<ServiceStatus[]> {
    return await this.controller.getAllStatuses(serviceNames);
  }

  async isActive(serviceName: string): Promise<boolean> {
    return await this.controller.isActive(serviceName);
  }

  async logs(serviceName: string, options: LogOptions): Promise<void> {
    await this.logger.follow(serviceName, options);
  }

  generateConfig(serviceName: string, app: NormalizedAppConfig): string {
    return generateUnitFile(app);
  }

  async install(serviceName: string, app: NormalizedAppConfig): Promise<void> {
    // Check permissions
    await checkPermissions(this.userMode);

    // Ensure unit directory exists
    await ensureUnitDirectory(this.userMode);

    // Generate unit file
    const unitContent = this.generateConfig(serviceName, app);

    // Write unit file
    const unitPath = getUnitFilePath(serviceName, this.userMode);
    await Bun.write(unitPath, unitContent);

    // Reload daemon and enable service
    await this.controller.daemonReload();
    await this.controller.enable(serviceName);
  }

  async remove(serviceName: string): Promise<void> {
    // Check permissions
    await checkPermissions(this.userMode);

    // Stop service if running
    const isActive = await this.controller.isActive(serviceName);
    if (isActive) {
      await this.controller.stop(serviceName);
    }

    // Disable service
    try {
      await this.controller.disable(serviceName);
    } catch {
      // Service might not be enabled, that's okay
    }

    // Remove unit file
    const unitPath = getUnitFilePath(serviceName, this.userMode);
    const exists = await unitFileExists(serviceName, this.userMode);
    if (exists) {
      await Bun.write(unitPath, ""); // Clear file
      const file = Bun.file(unitPath);
      // Delete file by unlinking
      try {
        await Bun.$`rm ${unitPath}`;
      } catch {
        throw new BunmanError(
          "Failed to remove unit file",
          `Could not delete ${unitPath}`
        );
      }
    }

    // Reload daemon
    await this.controller.daemonReload();
  }

  async reload(): Promise<void> {
    await this.controller.daemonReload();
  }

  async enable(serviceName: string): Promise<void> {
    await this.controller.enable(serviceName);
  }

  async disable(serviceName: string): Promise<void> {
    await this.controller.disable(serviceName);
  }
}

