/**
 * ANSI color codes for terminal output
 */
export const COLORS = {
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

export type ColorName = keyof typeof COLORS;

/**
 * Check if terminal supports colors
 */
export function supportsColor(): boolean {
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

/**
 * Colorize a string if colors are supported
 */
export function colorize(text: string, ...codes: string[]): string {
  if (!supportsColor()) return text;
  return codes.join("") + text + COLORS.reset;
}

/**
 * Color helper functions
 */
export const color = {
  red: (text: string) => colorize(text, COLORS.red),
  green: (text: string) => colorize(text, COLORS.green),
  yellow: (text: string) => colorize(text, COLORS.yellow),
  blue: (text: string) => colorize(text, COLORS.blue),
  magenta: (text: string) => colorize(text, COLORS.magenta),
  cyan: (text: string) => colorize(text, COLORS.cyan),
  gray: (text: string) => colorize(text, COLORS.gray),
  bold: (text: string) => colorize(text, COLORS.bold),
  dim: (text: string) => colorize(text, COLORS.dim),
} as const;
