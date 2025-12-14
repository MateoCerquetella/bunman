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
  return `# bunman bash completion
# Add to ~/.bashrc: eval "$(bunman completions bash)"

_bunman_completions() {
    local cur prev commands services
    COMPREPLY=()
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"

    commands="init start stop restart remove logs status startall stopall restartall doctor completions help version"

    case "\${prev}" in
        bunman)
            COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
            return 0
            ;;
        start|stop|restart|remove|logs)
            # Try to get service names from config
            if [ -f "bunman.config.ts" ]; then
                services=$(grep -oP "^\\s+\\K[a-zA-Z0-9_-]+(?=:)" bunman.config.ts 2>/dev/null | tr '\\n' ' ')
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

complete -F _bunman_completions bunman
`;
}

function generateZshCompletions(): string {
  return `#compdef bunman
# bunman zsh completion
# Add to ~/.zshrc: eval "$(bunman completions zsh)"

_bunman() {
    local -a commands
    commands=(
        'init:Create a new bunman.config.ts file'
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
                    if [[ -f "bunman.config.ts" ]]; then
                        local -a services
                        services=(\${(f)"$(grep -oP '^\\s+\\K[a-zA-Z0-9_-]+(?=:)' bunman.config.ts 2>/dev/null)"})
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

compdef _bunman bunman
`;
}

function generateFishCompletions(): string {
  return `# bunman fish completion
# Save to ~/.config/fish/completions/bunman.fish

# Disable file completion
complete -c bunman -f

# Commands
complete -c bunman -n "__fish_use_subcommand" -a "init" -d "Create a new bunman.config.ts file"
complete -c bunman -n "__fish_use_subcommand" -a "start" -d "Start a service"
complete -c bunman -n "__fish_use_subcommand" -a "stop" -d "Stop a service"
complete -c bunman -n "__fish_use_subcommand" -a "restart" -d "Restart a service"
complete -c bunman -n "__fish_use_subcommand" -a "remove" -d "Remove a service"
complete -c bunman -n "__fish_use_subcommand" -a "logs" -d "View service logs"
complete -c bunman -n "__fish_use_subcommand" -a "status" -d "Show status of all services"
complete -c bunman -n "__fish_use_subcommand" -a "startall" -d "Start all services"
complete -c bunman -n "__fish_use_subcommand" -a "stopall" -d "Stop all services"
complete -c bunman -n "__fish_use_subcommand" -a "restartall" -d "Restart all services"
complete -c bunman -n "__fish_use_subcommand" -a "doctor" -d "Check system requirements"
complete -c bunman -n "__fish_use_subcommand" -a "completions" -d "Generate shell completions"
complete -c bunman -n "__fish_use_subcommand" -a "help" -d "Show help message"
complete -c bunman -n "__fish_use_subcommand" -a "version" -d "Show version number"

# Completions subcommand
complete -c bunman -n "__fish_seen_subcommand_from completions" -a "bash zsh fish"

# Options for init
complete -c bunman -n "__fish_seen_subcommand_from init" -l minimal -d "Create minimal config"
complete -c bunman -n "__fish_seen_subcommand_from init" -l monorepo -d "Create monorepo config"

# Options for start/restart
complete -c bunman -n "__fish_seen_subcommand_from start restart" -l dry-run -d "Show what would be done"
complete -c bunman -n "__fish_seen_subcommand_from start restart" -l json -d "Output JSON"

# Options for logs
complete -c bunman -n "__fish_seen_subcommand_from logs" -s f -l follow -d "Follow logs"
complete -c bunman -n "__fish_seen_subcommand_from logs" -s n -l lines -d "Number of lines" -r
complete -c bunman -n "__fish_seen_subcommand_from logs" -l since -d "Show logs since" -r
complete -c bunman -n "__fish_seen_subcommand_from logs" -l until -d "Show logs until" -r
complete -c bunman -n "__fish_seen_subcommand_from logs" -s r -l reverse -d "Reverse order"

# Options for status
complete -c bunman -n "__fish_seen_subcommand_from status" -l json -d "Output JSON"

# Options for remove
complete -c bunman -n "__fish_seen_subcommand_from remove" -s f -l force -d "Force removal"

# Service name completions (dynamic)
function __bunman_services
    if test -f bunman.config.ts
        grep -oP '^\\s+\\K[a-zA-Z0-9_-]+(?=:)' bunman.config.ts 2>/dev/null
    end
end

complete -c bunman -n "__fish_seen_subcommand_from start stop restart remove logs" -a "(__bunman_services)"
`;
}
