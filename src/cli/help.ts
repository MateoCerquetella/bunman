import { VERSION, NAME } from "../constants";
import { logger } from "../utils/logger";
import type { CommandName } from "../types/cli";

/**
 * Helper for exhaustiveness checking
 */
function assertNever(value: never): never {
  throw new Error(`Unhandled command: ${value}`);
}

/**
 * Print the main help message
 */
export function printHelp(): void {
  const { color } = logger;

  console.log(`
${color.bold(NAME)} ${color.dim(`v${VERSION}`)}
${color.dim("Bun-native process manager powered by systemd")}

${color.bold("USAGE")}
  ${NAME} ${color.cyan("<command>")} ${color.dim("[options]")}

${color.bold("COMMANDS")}
  ${color.cyan("init")}                 Create a new bunman.config.ts file
  ${color.cyan("start")} [service]      Start a service or all services
  ${color.cyan("stop")} [service]       Stop a service or all services
  ${color.cyan("restart")} [service]    Restart a service or all services
  ${color.cyan("remove")} <service>     Remove a service (stop, disable, delete)
  ${color.cyan("logs")} [service]       View logs for a service or all services
  ${color.cyan("status")}               Show status of all services
  ${color.cyan("doctor")}               Check system requirements
  ${color.cyan("help")}                 Show this help message
  ${color.cyan("version")}              Show version number

${color.bold("OPTIONS")}
  ${color.dim("-h, --help")}     Show help
  ${color.dim("-v, --version")}  Show version

${color.bold("EXAMPLES")}
  ${color.dim("# Initialize configuration")}
  ${NAME} init

  ${color.dim("# Start a specific service")}
  ${NAME} start api

  ${color.dim("# Start all services")}
  ${NAME} start

  ${color.dim("# View all logs (follow mode)")}
  ${NAME} logs -f

  ${color.dim("# View specific service logs")}
  ${NAME} logs api -f

  ${color.dim("# Check all services")}
  ${NAME} status

  ${color.dim("# Stop all services")}
  ${NAME} stop

${color.bold("DOCUMENTATION")}
  ${color.dim("https://github.com/your-username/bunman")}
`);
}

/**
 * Print help for a specific command
 */
export function printCommandHelp(command: string): void {
  const { color } = logger;

  // Cast to CommandName for exhaustiveness checking
  const cmd = command as CommandName;

  switch (cmd) {
    case "init":
      console.log(`
${color.bold("bunman init")}
Create a new bunman.config.ts configuration file.

${color.bold("USAGE")}
  bunman init ${color.dim("[options]")}

${color.bold("OPTIONS")}
  ${color.dim("--minimal")}   Create minimal config (no comments)
  ${color.dim("--monorepo")}  Create monorepo-style config

${color.bold("EXAMPLES")}
  bunman init
  bunman init --minimal
  bunman init --monorepo
`);
      break;

    case "start":
      console.log(`
${color.bold("bunman start [service]")}
Start a service or all services defined in bunman.config.ts.

${color.bold("USAGE")}
  bunman start [service]

${color.bold("DESCRIPTION")}
  Generates systemd unit files, reloads systemd, enables services
  to start on boot, and starts them.

  If no service name is provided, starts all services.

${color.bold("EXAMPLES")}
  bunman start          ${color.dim("# Start all services")}
  bunman start api      ${color.dim("# Start a specific service")}
  bunman start worker
`);
      break;

    case "stop":
      console.log(`
${color.bold("bunman stop [service]")}
Stop a running service or all services.

${color.bold("USAGE")}
  bunman stop [service]

${color.bold("DESCRIPTION")}
  If no service name is provided, stops all running services.

${color.bold("EXAMPLES")}
  bunman stop           ${color.dim("# Stop all services")}
  bunman stop api       ${color.dim("# Stop a specific service")}
`);
      break;

    case "restart":
      console.log(`
${color.bold("bunman restart [service]")}
Restart a service or all services.

${color.bold("USAGE")}
  bunman restart [service]

${color.bold("DESCRIPTION")}
  Updates unit files and restarts services.
  Useful after configuration changes.

  If no service name is provided, restarts all services.

${color.bold("EXAMPLES")}
  bunman restart        ${color.dim("# Restart all services")}
  bunman restart api    ${color.dim("# Restart a specific service")}
`);
      break;

    case "logs":
      console.log(`
${color.bold("bunman logs [service]")}
View logs for a service or all services.

${color.bold("USAGE")}
  bunman logs [service] ${color.dim("[options]")}

${color.bold("DESCRIPTION")}
  If no service name is provided, shows logs for all services
  with color-coded prefixes.

${color.bold("OPTIONS")}
  ${color.dim("-f, --follow")}     Follow log output (stream)
  ${color.dim("-n, --lines")} <n>  Number of lines to show (default: 50)
  ${color.dim("--since")} <time>   Show logs since timestamp
  ${color.dim("--until")} <time>   Show logs until timestamp
  ${color.dim("-r, --reverse")}    Show newest entries first
  ${color.dim("--clear")}          Clear log files

${color.bold("EXAMPLES")}
  bunman logs api
  bunman logs api -f
  bunman logs api -n 100
  bunman logs api --since "1 hour ago"
  bunman logs --clear             ${color.dim("# Clear all logs")}
  bunman logs gateway --clear     ${color.dim("# Clear logs for specific service")}
`);
      break;

    case "status":
      console.log(`
${color.bold("bunman status")}
Show status of all services defined in bunman.config.ts.

${color.bold("USAGE")}
  bunman status ${color.dim("[service]")}

${color.bold("DESCRIPTION")}
  Shows a table with service status, PID, memory usage, and uptime.
  Optionally specify a service name to show detailed status.

${color.bold("EXAMPLES")}
  bunman status
  bunman status api
`);
      break;

    case "remove":
      console.log(`
${color.bold("bunman remove <service>")}
Remove a service (stop, disable, and delete unit file).

${color.bold("USAGE")}
  bunman remove <service> ${color.dim("[options]")}

${color.bold("OPTIONS")}
  ${color.dim("-f, --force")}  Skip confirmation prompt

${color.bold("DESCRIPTION")}
  Stops the service if running, disables it from starting on boot,
  and deletes the systemd unit file.

${color.bold("EXAMPLES")}
  bunman remove api --force
`);
      break;

    case "doctor":
      console.log(`
${color.bold("bunman doctor")}
Check system requirements and diagnose issues.

${color.bold("USAGE")}
  bunman doctor

${color.bold("DESCRIPTION")}
  Checks for:
  - Bun runtime version
  - systemd availability
  - Root/sudo access
  - systemd directory permissions
  - Configuration file
  - journalctl availability
`);
      break;

    // Backward compatibility aliases - show the equivalent command help
    case "startall":
      printCommandHelp("start");
      break;

    case "stopall":
      printCommandHelp("stop");
      break;

    case "restartall":
      printCommandHelp("restart");
      break;

    // These just show main help
    case "help":
    case "version":
      printHelp();
      break;

    default:
      // Exhaustiveness check - TypeScript will error if we add a new command
      // but don't handle it here
      assertNever(cmd);
  }
}

/**
 * Print the version
 */
export function printVersion(): void {
  console.log(`${NAME} v${VERSION}`);
}
