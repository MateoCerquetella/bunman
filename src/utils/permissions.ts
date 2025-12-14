import { PermissionError } from "./errors";

/**
 * Check if running as root
 */
export function isRoot(): boolean {
  return process.getuid?.() === 0;
}

/**
 * Check if user has permission for systemd operations
 * @param userMode - Whether using user-mode systemd
 * @throws PermissionError if permission is insufficient
 */
export async function checkPermissions(userMode: boolean = false): Promise<void> {
  // User mode doesn't require root
  if (userMode) {
    return;
  }

  // System mode requires root
  if (!isRoot()) {
    throw new PermissionError("systemd system-level operations");
  }
}

/**
 * Get the current user ID
 */
export function getUid(): number {
  return process.getuid?.() ?? 1000;
}

/**
 * Get the current group ID
 */
export function getGid(): number {
  return process.getgid?.() ?? 1000;
}

/**
 * Check if a file path is writable
 */
export async function isWritable(path: string): Promise<boolean> {
  try {
    // Check if parent directory exists and is writable
    const parentDir = path.substring(0, path.lastIndexOf("/"));
    const testFile = `${parentDir}/.bunpm-test-${Date.now()}`;

    await Bun.write(testFile, "");
    await Bun.file(testFile).delete();

    return true;
  } catch {
    return false;
  }
}

/**
 * Check if systemd is available
 */
export async function isSystemdAvailable(): Promise<boolean> {
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
