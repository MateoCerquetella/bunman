import type { ParsedArgs, CommandName } from "../types/cli";
import { CommandError } from "../utils/errors";

/**
 * Valid command names
 */
const COMMANDS: CommandName[] = [
  "init",
  "start",
  "stop",
  "restart",
  "logs",
  "status",
  "remove",
  "doctor",
  "startall",
  "stopall",
  "restartall",
  "help",
  "version",
];

/**
 * Parse CLI arguments
 */
export function parseArgs(argv: string[]): ParsedArgs {
  // Default to help if no arguments
  if (argv.length === 0) {
    return { command: "help", args: [], options: {} };
  }

  // Check for --version or -v flags first
  if (argv[0] === "--version" || argv[0] === "-v") {
    return { command: "version", args: [], options: {} };
  }

  // Check for --help or -h flags
  if (argv[0] === "--help" || argv[0] === "-h") {
    return { command: "help", args: [], options: {} };
  }

  const command = argv[0] as CommandName;

  // Validate command
  if (!COMMANDS.includes(command)) {
    throw new CommandError(
      `Unknown command: ${command}`,
      `Run "bunman help" for available commands`
    );
  }

  const args: string[] = [];
  const options: Record<string, string | boolean> = {};

  // Parse remaining arguments
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i]!;

    if (arg.startsWith("--")) {
      // Long option: --key=value or --flag
      const eqIndex = arg.indexOf("=");

      if (eqIndex !== -1) {
        // --key=value format
        const key = arg.slice(2, eqIndex);
        const value = arg.slice(eqIndex + 1);
        options[key] = value;
      } else {
        // --flag format (check for next arg as value)
        const key = arg.slice(2);
        const next = argv[i + 1];

        if (next && !next.startsWith("-")) {
          options[key] = next;
          i++; // Skip next arg
        } else {
          options[key] = true;
        }
      }
    } else if (arg.startsWith("-") && arg.length === 2) {
      // Short option: -n 100 or -f
      const key = arg.slice(1);
      const next = argv[i + 1];

      if (next && !next.startsWith("-")) {
        options[key] = next;
        i++; // Skip next arg
      } else {
        options[key] = true;
      }
    } else {
      // Positional argument
      args.push(arg);
    }
  }

  return { command, args, options };
}

/**
 * Get a string option value
 */
export function getStringOption(
  options: Record<string, string | boolean>,
  name: string,
  short?: string,
  defaultValue?: string
): string | undefined {
  const value = options[name] ?? (short ? options[short] : undefined);

  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return defaultValue;
  }

  return value;
}

/**
 * Get a number option value
 */
export function getNumberOption(
  options: Record<string, string | boolean>,
  name: string,
  short?: string,
  defaultValue?: number
): number | undefined {
  const value = getStringOption(options, name, short);

  if (value === undefined) {
    return defaultValue;
  }

  const num = parseInt(value, 10);

  if (isNaN(num)) {
    throw new CommandError(
      `Invalid value for --${name}: expected a number`,
      `Example: --${name} 100`
    );
  }

  return num;
}

/**
 * Get a boolean option value
 */
export function getBooleanOption(
  options: Record<string, string | boolean>,
  name: string,
  short?: string,
  defaultValue: boolean = false
): boolean {
  const value = options[name] ?? (short ? options[short] : undefined);

  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  // String values
  const lower = value.toLowerCase();
  return lower === "true" || lower === "yes" || lower === "1";
}
