import type { CommandContext } from "../../types/cli";
import { logger } from "../../utils/logger";
import { isRoot, isSystemdAvailable } from "../../utils/permissions";
import { configExists } from "../../core/config";
import { SYSTEMD_PATHS } from "../../constants";

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
  logger.bold("bunpm doctor");
  logger.dim("Checking system requirements...\n");

  const checks: CheckResult[] = [];

  // Check 1: Bun version
  checks.push(await checkBun());

  // Check 2: systemd availability
  checks.push(await checkSystemd());

  // Check 3: Root/sudo access
  checks.push(checkRootAccess());

  // Check 4: systemd directory permissions
  checks.push(await checkSystemdDirectory());

  // Check 5: Config file
  checks.push(await checkConfig(ctx.cwd));

  // Check 6: journalctl availability
  checks.push(await checkJournalctl());

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
    logger.success("All checks passed! bunpm is ready to use.");
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

async function checkSystemd(): Promise<CheckResult> {
  const available = await isSystemdAvailable();

  if (available) {
    // Get systemd version
    try {
      const proc = Bun.spawn(["systemctl", "--version"], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const stdout = await new Response(proc.stdout).text();
      const versionMatch = stdout.match(/systemd (\d+)/);
      const version = versionMatch?.[1] ?? "unknown";

      return {
        name: "systemd",
        status: "ok",
        message: `systemd ${version} available`,
      };
    } catch {
      return {
        name: "systemd",
        status: "ok",
        message: "systemd available",
      };
    }
  }

  return {
    name: "systemd",
    status: "error",
    message: "systemd not available",
    help: "bunpm requires Linux with systemd",
  };
}

function checkRootAccess(): CheckResult {
  const hasRoot = isRoot();

  if (hasRoot) {
    return {
      name: "Root access",
      status: "ok",
      message: "Running as root",
    };
  }

  return {
    name: "Root access",
    status: "warn",
    message: "Not running as root",
    help: "Run with sudo for system-level services, or use userMode: true",
  };
}

async function checkSystemdDirectory(): Promise<CheckResult> {
  const systemDir = SYSTEMD_PATHS.system;

  try {
    const dir = Bun.file(systemDir);
    const exists = await dir.exists();

    if (exists) {
      // Try to check if writable (rough check)
      if (isRoot()) {
        return {
          name: "systemd directory",
          status: "ok",
          message: `${systemDir} is accessible`,
        };
      }

      return {
        name: "systemd directory",
        status: "warn",
        message: `${systemDir} exists but may not be writable`,
        help: "Run with sudo or use userMode: true in config",
      };
    }

    return {
      name: "systemd directory",
      status: "error",
      message: `${systemDir} does not exist`,
      help: "Ensure systemd is properly installed",
    };
  } catch {
    return {
      name: "systemd directory",
      status: "warn",
      message: `Cannot check ${systemDir}`,
      help: "Run with sudo to check system directories",
    };
  }
}

async function checkConfig(cwd: string): Promise<CheckResult> {
  const exists = await configExists(cwd);

  if (exists) {
    return {
      name: "Configuration",
      status: "ok",
      message: "bunpm.config.ts found",
    };
  }

  return {
    name: "Configuration",
    status: "warn",
    message: "No bunpm.config.ts found",
    help: 'Run "bunpm init" to create a configuration file',
  };
}

async function checkJournalctl(): Promise<CheckResult> {
  try {
    const proc = Bun.spawn(["which", "journalctl"], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await proc.exited;

    if (exitCode === 0) {
      return {
        name: "journalctl",
        status: "ok",
        message: "journalctl available for log viewing",
      };
    }

    return {
      name: "journalctl",
      status: "warn",
      message: "journalctl not found",
      help: "Log viewing may not work without journalctl",
    };
  } catch {
    return {
      name: "journalctl",
      status: "warn",
      message: "Could not check for journalctl",
    };
  }
}
