import { COLORS, colorize, color } from "./colors";

/**
 * Logger with colored output
 */
export const logger = {
  /**
   * Log an informational message
   */
  info(message: string, ...args: unknown[]): void {
    const prefix = colorize("\u2139", COLORS.blue);
    console.log(`${prefix} ${message}`, ...args);
  },

  /**
   * Log a success message
   */
  success(message: string, ...args: unknown[]): void {
    const prefix = colorize("\u2713", COLORS.green);
    console.log(`${prefix} ${message}`, ...args);
  },

  /**
   * Log a warning message
   */
  warn(message: string, ...args: unknown[]): void {
    const prefix = colorize("\u26A0", COLORS.yellow);
    console.warn(`${prefix} ${message}`, ...args);
  },

  /**
   * Log an error message
   */
  error(message: string, ...args: unknown[]): void {
    const prefix = colorize("\u2717", COLORS.red);
    console.error(`${prefix} ${message}`, ...args);
  },

  /**
   * Log a debug message (only in development)
   */
  debug(message: string, ...args: unknown[]): void {
    if (process.env["DEBUG"]) {
      const prefix = colorize("\u2699", COLORS.gray);
      console.log(`${prefix} ${message}`, ...args);
    }
  },

  /**
   * Log a step/progress message
   */
  step(message: string, ...args: unknown[]): void {
    const prefix = colorize("\u2192", COLORS.cyan);
    console.log(`${prefix} ${message}`, ...args);
  },

  /**
   * Log a dimmed/secondary message
   */
  dim(message: string, ...args: unknown[]): void {
    console.log(colorize(message, COLORS.dim), ...args);
  },

  /**
   * Log a bold message
   */
  bold(message: string, ...args: unknown[]): void {
    console.log(colorize(message, COLORS.bold), ...args);
  },

  /**
   * Create a colored string without logging
   */
  color,
};
