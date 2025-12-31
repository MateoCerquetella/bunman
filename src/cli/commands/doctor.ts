import type { CommandContext } from "../../types/cli";
import { logger } from "../../utils/logger";
import { isRoot } from "../../utils/permissions";
import { configExists } from "../../core/config";
import { getServiceManager, getPlatformName } from "../../core/backend";

interface CheckResult {
  name: string;
  status: "ok" | "warn" | "error";
  message: string;
  help?: string;
}

/**
 * Diagnose system requirements and issues
 */
export async function doctorCommand(ctx: CommandContext): Promise<void> {
  logger.bold("bunman doctor");
  logger.dim("Checking system requirements...\n");

  const checks: CheckResult[] = [];

  // Check 1: Platform support
  checks.push(checkPlatform());

  // Check 2: Bun version
  checks.push(await checkBun());

  // Check 3: Service manager availability
  checks.push(await checkServiceManager());

  // Check 4: Root/sudo access (if needed)
  checks.push(checkRootAccess());

  // Check 5: Config file
  checks.push(await checkConfig(ctx.cwd));

  // Display results
  console.log("");

  let hasErrors = false;
  let hasWarnings = false;

  for (const check of checks) {
    const icon =
      check.status === "ok"
        ? logger.color.green("✓")
        : check.status === "warn"
          ? logger.color.yellow("⚠")
          : logger.color.red("✗");

    console.log(`${icon} ${check.name}`);
    console.log(`  ${logger.color.dim(check.message)}`);

    if (check.help) {
      console.log(`  ${logger.color.cyan("→")} ${check.help}`);
    }

    console.log("");

    if (check.status === "error") hasErrors = true;
    if (check.status === "warn") hasWarnings = true;
  }

  // Summary
  if (hasErrors) {
    logger.error("Some checks failed. Please fix the issues above.");
    process.exit(1);
  } else if (hasWarnings) {
    logger.warn("All critical checks passed, but there are warnings.");
  } else {
    logger.success("All checks passed! bunman is ready to use.");
  }
}

async function checkBun(): Promise<CheckResult> {
  try {
    const version = Bun.version;
    const [major, minor] = version.split(".").map(Number);

    if (major! >= 1) {
      return {
        name: "Bun runtime",
        status: "ok",
        message: `Bun ${version} installed`,
      };
    }

    return {
      name: "Bun runtime",
      status: "warn",
      message: `Bun ${version} installed (recommend 1.0+)`,
      help: "Update Bun: curl -fsSL https://bun.sh/install | bash",
    };
  } catch {
    return {
      name: "Bun runtime",
      status: "error",
      message: "Bun not detected",
      help: "Install Bun: curl -fsSL https://bun.sh/install | bash",
    };
  }
}

function checkPlatform(): CheckResult {
  const platform = getPlatformName();
  const supported = process.platform === "linux" || process.platform === "darwin";

  if (supported) {
    return {
      name: "Platform",
      status: "ok",
      message: `${platform} is supported`,
    };
  }

  return {
    name: "Platform",
    status: "error",
    message: `${platform} is not supported`,
    help: "bunman currently supports Linux and macOS",
  };
}

async function checkServiceManager(): Promise<CheckResult> {
  try {
    const serviceManager = getServiceManager();
    const available = await serviceManager.isAvailable();

    if (available) {
      // Get version info
      const name = serviceManager.getName();
      
      if (name === "systemd") {
        try {
          const proc = Bun.spawn(["systemctl", "--version"], {
            stdout: "pipe",
            stderr: "pipe",
          });

          const stdout = await new Response(proc.stdout).text();
          const versionMatch = stdout.match(/systemd (\d+)/);
          const version = versionMatch?.[1] ?? "unknown";

          return {
            name: "Service Manager",
            status: "ok",
            message: `systemd ${version} available`,
          };
        } catch {
          return {
            name: "Service Manager",
            status: "ok",
            message: "systemd available",
          };
        }
      } else if (name === "launchd") {
        return {
          name: "Service Manager",
          status: "ok",
          message: "launchd available",
        };
      }

      return {
        name: "Service Manager",
        status: "ok",
        message: `${name} available`,
      };
    }

    return {
      name: "Service Manager",
      status: "error",
      message: `${serviceManager.getName()} not available`,
      help: `bunman requires ${serviceManager.getName()} on ${getPlatformName()}`,
    };
  } catch (error) {
    return {
      name: "Service Manager",
      status: "error",
      message: "Could not detect service manager",
      help: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function checkRootAccess(): CheckResult {
  const platform = process.platform;
  const hasRoot = isRoot();

  if (platform === "darwin") {
    // macOS uses user-level LaunchAgents by default
    return {
      name: "Permissions",
      status: "ok",
      message: "Running in user mode (macOS default)",
    };
  }

  if (hasRoot) {
    return {
      name: "Permissions",
      status: "ok",
      message: "Running as root",
    };
  }

  return {
    name: "Permissions",
    status: "warn",
    message: "Not running as root",
    help: "Run with sudo for system-level services, or use userMode: true in config",
  };
}

async function checkConfig(cwd: string): Promise<CheckResult> {
  const exists = await configExists(cwd);

  if (exists) {
    return {
      name: "Configuration",
      status: "ok",
      message: "bunman.config.ts found",
    };
  }

  return {
    name: "Configuration",
    status: "warn",
    message: "No bunman.config.ts found",
    help: 'Run "bunman init" to create a configuration file',
  };
}

