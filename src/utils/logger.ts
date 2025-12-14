/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",

  // Foreground colors
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",

  // Background colors
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
} as const;

/**
 * Check if terminal supports colors
 */
function supportsColor(): boolean {
  // Check NO_COLOR env var (https://no-color.org/)
  if (process.env["NO_COLOR"] !== undefined) {
    return false;
  }

  // Check FORCE_COLOR env var
  if (process.env["FORCE_COLOR"] !== undefined) {
    return true;
  }

  // Check if stdout is a TTY
  return process.stdout.isTTY ?? false;
}

const useColor = supportsColor();

/**
 * Colorize a string if colors are supported
 */
function colorize(text: string, ...codes: string[]): string {
  if (!useColor) return text;
  return codes.join("") + text + colors.reset;
}

/**
 * Logger with colored output
 */
export const logger = {
  /**
   * Log an informational message
   */
  info(message: string, ...args: unknown[]): void {
    const prefix = colorize("ℹ", colors.blue);
    console.log(`${prefix} ${message}`, ...args);
  },

  /**
   * Log a success message
   */
  success(message: string, ...args: unknown[]): void {
    const prefix = colorize("✓", colors.green);
    console.log(`${prefix} ${message}`, ...args);
  },

  /**
   * Log a warning message
   */
  warn(message: string, ...args: unknown[]): void {
    const prefix = colorize("⚠", colors.yellow);
    console.warn(`${prefix} ${message}`, ...args);
  },

  /**
   * Log an error message
   */
  error(message: string, ...args: unknown[]): void {
    const prefix = colorize("✗", colors.red);
    console.error(`${prefix} ${message}`, ...args);
  },

  /**
   * Log a debug message (only in development)
   */
  debug(message: string, ...args: unknown[]): void {
    if (process.env["DEBUG"]) {
      const prefix = colorize("⚙", colors.gray);
      console.log(`${prefix} ${message}`, ...args);
    }
  },

  /**
   * Log a step/progress message
   */
  step(message: string, ...args: unknown[]): void {
    const prefix = colorize("→", colors.cyan);
    console.log(`${prefix} ${message}`, ...args);
  },

  /**
   * Log a dimmed/secondary message
   */
  dim(message: string, ...args: unknown[]): void {
    console.log(colorize(message, colors.dim), ...args);
  },

  /**
   * Log a bold message
   */
  bold(message: string, ...args: unknown[]): void {
    console.log(colorize(message, colors.bold), ...args);
  },

  /**
   * Create a colored string without logging
   */
  color: {
    red: (text: string) => colorize(text, colors.red),
    green: (text: string) => colorize(text, colors.green),
    yellow: (text: string) => colorize(text, colors.yellow),
    blue: (text: string) => colorize(text, colors.blue),
    magenta: (text: string) => colorize(text, colors.magenta),
    cyan: (text: string) => colorize(text, colors.cyan),
    gray: (text: string) => colorize(text, colors.gray),
    bold: (text: string) => colorize(text, colors.bold),
    dim: (text: string) => colorize(text, colors.dim),
  },
};
