import type { CommandContext } from "../../types/cli";
import { CommandError } from "../../utils/errors";

/**
 * Generate shell completions
 */
export async function completionsCommand(ctx: CommandContext): Promise<void> {
  const shell = ctx.args.args[0] ?? "bash";

  switch (shell) {
    case "bash":
      console.log(generateBashCompletions());
      break;
    case "zsh":
      console.log(generateZshCompletions());
      break;
    case "fish":
      console.log(generateFishCompletions());
      break;
    default:
      throw new CommandError(
        `Unknown shell: ${shell}`,
        "Supported shells: bash, zsh, fish"
      );
  }
}

function generateBashCompletions(): string {
  return `# bunpm bash completion
# Add to ~/.bashrc: eval "$(bunpm completions bash)"

_bunpm_completions() {
    local cur prev commands services
    COMPREPLY=()
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"

    commands="init start stop restart remove logs status startall stopall restartall doctor completions help version"

    case "\${prev}" in
        bunpm)
            COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
            return 0
            ;;
        start|stop|restart|remove|logs)
            # Try to get service names from config
            if [ -f "bunpm.config.ts" ]; then
                services=$(grep -oP "^\\s+\\K[a-zA-Z0-9_-]+(?=:)" bunpm.config.ts 2>/dev/null | tr '\\n' ' ')
                COMPREPLY=( $(compgen -W "\${services}" -- "\${cur}") )
            fi
            return 0
            ;;
        completions)
            COMPREPLY=( $(compgen -W "bash zsh fish" -- "\${cur}") )
            return 0
            ;;
    esac

    # Options
    if [[ \${cur} == -* ]]; then
        case "\${COMP_WORDS[1]}" in
            start|restart)
                COMPREPLY=( $(compgen -W "--dry-run --json" -- "\${cur}") )
                ;;
            stop)
                COMPREPLY=( $(compgen -W "--json" -- "\${cur}") )
                ;;
            remove)
                COMPREPLY=( $(compgen -W "--force -f" -- "\${cur}") )
                ;;
            logs)
                COMPREPLY=( $(compgen -W "--follow -f --lines -n --since --until --reverse -r" -- "\${cur}") )
                ;;
            status)
                COMPREPLY=( $(compgen -W "--json" -- "\${cur}") )
                ;;
            init)
                COMPREPLY=( $(compgen -W "--minimal --monorepo" -- "\${cur}") )
                ;;
        esac
        return 0
    fi
}

complete -F _bunpm_completions bunpm
`;
}

function generateZshCompletions(): string {
  return `#compdef bunpm
# bunpm zsh completion
# Add to ~/.zshrc: eval "$(bunpm completions zsh)"

_bunpm() {
    local -a commands
    commands=(
        'init:Create a new bunpm.config.ts file'
        'start:Start a service'
        'stop:Stop a service'
        'restart:Restart a service'
        'remove:Remove a service'
        'logs:View service logs'
        'status:Show status of all services'
        'startall:Start all services'
        'stopall:Stop all services'
        'restartall:Restart all services'
        'doctor:Check system requirements'
        'completions:Generate shell completions'
        'help:Show help message'
        'version:Show version number'
    )

    _arguments -C \\
        '1: :->command' \\
        '*: :->args'

    case $state in
        command)
            _describe 'command' commands
            ;;
        args)
            case $words[2] in
                start|stop|restart|remove|logs)
                    # Get service names from config
                    if [[ -f "bunpm.config.ts" ]]; then
                        local -a services
                        services=(\${(f)"$(grep -oP '^\\s+\\K[a-zA-Z0-9_-]+(?=:)' bunpm.config.ts 2>/dev/null)"})
                        _describe 'service' services
                    fi
                    ;;
                completions)
                    _values 'shell' 'bash' 'zsh' 'fish'
                    ;;
                init)
                    _arguments \\
                        '--minimal[Create minimal config]' \\
                        '--monorepo[Create monorepo config]'
                    ;;
                start|restart)
                    _arguments \\
                        '--dry-run[Show what would be done]' \\
                        '--json[Output JSON]'
                    ;;
                logs)
                    _arguments \\
                        '-f[Follow logs]' '--follow[Follow logs]' \\
                        '-n[Number of lines]:lines:' '--lines[Number of lines]:lines:' \\
                        '--since[Show logs since]:time:' \\
                        '--until[Show logs until]:time:' \\
                        '-r[Reverse order]' '--reverse[Reverse order]'
                    ;;
                status)
                    _arguments '--json[Output JSON]'
                    ;;
                remove)
                    _arguments '-f[Force removal]' '--force[Force removal]'
                    ;;
            esac
            ;;
    esac
}

compdef _bunpm bunpm
`;
}

function generateFishCompletions(): string {
  return `# bunpm fish completion
# Save to ~/.config/fish/completions/bunpm.fish

# Disable file completion
complete -c bunpm -f

# Commands
complete -c bunpm -n "__fish_use_subcommand" -a "init" -d "Create a new bunpm.config.ts file"
complete -c bunpm -n "__fish_use_subcommand" -a "start" -d "Start a service"
complete -c bunpm -n "__fish_use_subcommand" -a "stop" -d "Stop a service"
complete -c bunpm -n "__fish_use_subcommand" -a "restart" -d "Restart a service"
complete -c bunpm -n "__fish_use_subcommand" -a "remove" -d "Remove a service"
complete -c bunpm -n "__fish_use_subcommand" -a "logs" -d "View service logs"
complete -c bunpm -n "__fish_use_subcommand" -a "status" -d "Show status of all services"
complete -c bunpm -n "__fish_use_subcommand" -a "startall" -d "Start all services"
complete -c bunpm -n "__fish_use_subcommand" -a "stopall" -d "Stop all services"
complete -c bunpm -n "__fish_use_subcommand" -a "restartall" -d "Restart all services"
complete -c bunpm -n "__fish_use_subcommand" -a "doctor" -d "Check system requirements"
complete -c bunpm -n "__fish_use_subcommand" -a "completions" -d "Generate shell completions"
complete -c bunpm -n "__fish_use_subcommand" -a "help" -d "Show help message"
complete -c bunpm -n "__fish_use_subcommand" -a "version" -d "Show version number"

# Completions subcommand
complete -c bunpm -n "__fish_seen_subcommand_from completions" -a "bash zsh fish"

# Options for init
complete -c bunpm -n "__fish_seen_subcommand_from init" -l minimal -d "Create minimal config"
complete -c bunpm -n "__fish_seen_subcommand_from init" -l monorepo -d "Create monorepo config"

# Options for start/restart
complete -c bunpm -n "__fish_seen_subcommand_from start restart" -l dry-run -d "Show what would be done"
complete -c bunpm -n "__fish_seen_subcommand_from start restart" -l json -d "Output JSON"

# Options for logs
complete -c bunpm -n "__fish_seen_subcommand_from logs" -s f -l follow -d "Follow logs"
complete -c bunpm -n "__fish_seen_subcommand_from logs" -s n -l lines -d "Number of lines" -r
complete -c bunpm -n "__fish_seen_subcommand_from logs" -l since -d "Show logs since" -r
complete -c bunpm -n "__fish_seen_subcommand_from logs" -l until -d "Show logs until" -r
complete -c bunpm -n "__fish_seen_subcommand_from logs" -s r -l reverse -d "Reverse order"

# Options for status
complete -c bunpm -n "__fish_seen_subcommand_from status" -l json -d "Output JSON"

# Options for remove
complete -c bunpm -n "__fish_seen_subcommand_from remove" -s f -l force -d "Force removal"

# Service name completions (dynamic)
function __bunpm_services
    if test -f bunpm.config.ts
        grep -oP '^\\s+\\K[a-zA-Z0-9_-]+(?=:)' bunpm.config.ts 2>/dev/null
    end
end

complete -c bunpm -n "__fish_seen_subcommand_from start stop restart remove logs" -a "(__bunpm_services)"
`;
}
