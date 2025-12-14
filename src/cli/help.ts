import { VERSION, NAME } from "../constants";
import { logger } from "../utils/logger";

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
  ${color.cyan("init")}              Create a new bunman.config.ts file
  ${color.cyan("start")} <service>   Start a service
  ${color.cyan("stop")} <service>    Stop a service
  ${color.cyan("restart")} <service> Restart a service
  ${color.cyan("remove")} <service>  Remove a service (stop, disable, delete)
  ${color.cyan("logs")} <service>    View service logs
  ${color.cyan("status")}            Show status of all services
  ${color.cyan("startall")}          Start all services
  ${color.cyan("stopall")}           Stop all services
  ${color.cyan("restartall")}        Restart all services
  ${color.cyan("doctor")}            Check system requirements
  ${color.cyan("help")}              Show this help message
  ${color.cyan("version")}           Show version number

${color.bold("OPTIONS")}
  ${color.dim("-h, --help")}     Show help
  ${color.dim("-v, --version")}  Show version

${color.bold("EXAMPLES")}
  ${color.dim("# Initialize configuration")}
  ${NAME} init

  ${color.dim("# Start the api service")}
  ${NAME} start api

  ${color.dim("# View logs (follow mode)")}
  ${NAME} logs api -f

  ${color.dim("# Check all services")}
  ${NAME} status

${color.bold("DOCUMENTATION")}
  ${color.dim("https://github.com/your-username/bunman")}
`);
}

/**
 * Print help for a specific command
 */
export function printCommandHelp(command: string): void {
  const { color } = logger;

  switch (command) {
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
${color.bold("bunman start <service>")}
Start a service defined in bunman.config.ts.

${color.bold("USAGE")}
  bunman start <service>

${color.bold("DESCRIPTION")}
  Generates a systemd unit file for the service, reloads systemd,
  enables the service to start on boot, and starts it.

${color.bold("EXAMPLES")}
  bunman start api
  bunman start worker
`);
      break;

    case "stop":
      console.log(`
${color.bold("bunman stop <service>")}
Stop a running service.

${color.bold("USAGE")}
  bunman stop <service>

${color.bold("EXAMPLES")}
  bunman stop api
`);
      break;

    case "restart":
      console.log(`
${color.bold("bunman restart <service>")}
Restart a service.

${color.bold("USAGE")}
  bunman restart <service>

${color.bold("EXAMPLES")}
  bunman restart api
`);
      break;

    case "logs":
      console.log(`
${color.bold("bunman logs <service>")}
View logs for a service from journalctl.

${color.bold("USAGE")}
  bunman logs <service> ${color.dim("[options]")}

${color.bold("OPTIONS")}
  ${color.dim("-f, --follow")}     Follow log output (stream)
  ${color.dim("-n, --lines")} <n>  Number of lines to show (default: 50)
  ${color.dim("--since")} <time>   Show logs since timestamp
  ${color.dim("--until")} <time>   Show logs until timestamp
  ${color.dim("-r, --reverse")}    Show newest entries first

${color.bold("EXAMPLES")}
  bunman logs api
  bunman logs api -f
  bunman logs api -n 100
  bunman logs api --since "1 hour ago"
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

    case "startall":
      console.log(`
${color.bold("bunman startall")}
Start all services defined in bunman.config.ts.

${color.bold("USAGE")}
  bunman startall

${color.bold("DESCRIPTION")}
  Generates unit files, enables, and starts all services.
`);
      break;

    case "stopall":
      console.log(`
${color.bold("bunman stopall")}
Stop all running services.

${color.bold("USAGE")}
  bunman stopall

${color.bold("DESCRIPTION")}
  Stops all services defined in the configuration.
  Services that are already stopped are skipped.
`);
      break;

    case "restartall":
      console.log(`
${color.bold("bunman restartall")}
Restart all services.

${color.bold("USAGE")}
  bunman restartall

${color.bold("DESCRIPTION")}
  Updates unit files and restarts all services.
  Useful after configuration changes.
`);
      break;

    default:
      printHelp();
  }
}

/**
 * Print the version
 */
export function printVersion(): void {
  console.log(`${NAME} v${VERSION}`);
}
