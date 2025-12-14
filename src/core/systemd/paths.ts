import { SYSTEMD_PATHS, DEFAULT_SERVICE_PREFIX } from "../../constants";

/**
 * Get the systemd unit file directory path
 */
export function getUnitDirectory(userMode: boolean = false): string {
  return userMode ? SYSTEMD_PATHS.user : SYSTEMD_PATHS.system;
}

/**
 * Get the full path to a unit file
 */
export function getUnitFilePath(
  serviceName: string,
  userMode: boolean = false
): string {
  const dir = getUnitDirectory(userMode);
  return `${dir}/${serviceName}.service`;
}

/**
 * Get the service name from an app name
 */
export function getServiceName(
  appName: string,
  prefix: string = DEFAULT_SERVICE_PREFIX
): string {
  return `${prefix}${appName}`;
}

/**
 * Extract app name from service name
 */
export function getAppName(
  serviceName: string,
  prefix: string = DEFAULT_SERVICE_PREFIX
): string {
  if (serviceName.startsWith(prefix)) {
    return serviceName.slice(prefix.length);
  }
  return serviceName;
}

/**
 * Check if a unit file exists
 */
export async function unitFileExists(
  serviceName: string,
  userMode: boolean = false
): Promise<boolean> {
  const path = getUnitFilePath(serviceName, userMode);
  const file = Bun.file(path);
  return file.exists();
}

/**
 * Ensure the unit directory exists (for user mode)
 */
export async function ensureUnitDirectory(userMode: boolean = false): Promise<void> {
  if (!userMode) {
    // System directory should already exist
    return;
  }

  const dir = getUnitDirectory(userMode);
  const file = Bun.file(dir);

  if (!(await file.exists())) {
    await Bun.spawn(["mkdir", "-p", dir]).exited;
  }
}
