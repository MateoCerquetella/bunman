import type { NormalizedConfig } from "./config";

/**
 * CLI command names
 */
export type CommandName =
  | "init"
  | "start"
  | "stop"
  | "restart"
  | "logs"
  | "status"
  | "remove"
  | "doctor"
  | "startall"
  | "stopall"
  | "restartall"
  | "help"
  | "version";

/**
 * Parsed CLI arguments
 */
export interface ParsedArgs {
  /** Command to execute */
  command: CommandName;

  /** Positional arguments */
  args: string[];

  /** Named options/flags */
  options: Record<string, string | boolean>;
}

/**
 * Command execution context
 */
export interface CommandContext {
  /** Parsed arguments */
  args: ParsedArgs;

  /** Current working directory */
  cwd: string;

  /** Config file path (if loaded) */
  configPath?: string;

  /** Loaded config (if applicable) */
  config?: NormalizedConfig;
}

/**
 * Command handler function
 */
export type CommandHandler = (ctx: CommandContext) => Promise<void>;

/**
 * Command definition
 */
export interface CommandDef {
  /** Command name */
  name: CommandName;

  /** Short description */
  description: string;

  /** Usage example */
  usage: string;

  /** Available options */
  options?: CommandOption[];

  /** Command handler */
  handler: CommandHandler;

  /** Whether this command requires a config file */
  requiresConfig: boolean;
}

/**
 * Command option definition
 */
export interface CommandOption {
  /** Option name (e.g., 'lines') */
  name: string;

  /** Short flag (e.g., 'n') */
  short?: string;

  /** Long flag (e.g., 'lines') */
  long: string;

  /** Description */
  description: string;

  /** Value type */
  type: "boolean" | "string" | "number";

  /** Default value */
  default?: string | boolean | number;
}
