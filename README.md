# bunman

> A Bun-native service manager for systemd and launchd

**bunman** is a CLI that manages long-running services by leveraging your OS's native service infrastructure. No daemon, no reimplemented process management—just a clean interface to systemd (Linux) and launchd (macOS).

## Why bunman?

**Philosophy**: Small surface area. Strong guarantees. Leave infrastructure to the OS.

- **OS-Native** — Uses battle-tested systemd/launchd instead of running a separate daemon
- **Cross-Platform** — Same config works on Linux and macOS
- **Bun-First** — Built exclusively for Bun
- **Monorepo Ready** — Manage multiple services from one config

## Platform Support

| Platform  | Service Manager | Status    |
| --------- | --------------- | --------- |
| Linux     | systemd         | Supported |
| macOS     | launchd         | Supported |
| Windows   | -               | Planned   |

## Installation

```bash
bun add -g bunman
```

## Quick Start

```bash
bunman init              # Create config
bunman start api         # Start service
bunman logs api -f       # View logs
bunman status            # Check status
```

## Configuration

Create `bunman.config.ts`:

```typescript
export default {
    apps: {
        api: {
            cwd: 'apps/api',
            command: 'bun run start',
            env: { PORT: '3000' }
        },
        worker: {
            cwd: 'apps/worker',
            command: 'bun run start'
        }
    }
};
```

### App Options

| Option       | Type     | Required | Description                         |
| ------------ | -------- | -------- | ----------------------------------- |
| `cwd`        | string   | Yes      | Working directory                   |
| `command`    | string   | Yes      | Command to execute                  |
| `env`        | object   | No       | Environment variables               |
| `user`       | string   | No       | Unix user                           |
| `group`      | string   | No       | Unix group                          |
| `restart`    | string   | No       | Restart policy (default: "always")  |
| `restartSec` | number   | No       | Restart delay in seconds            |
| `limits`     | object   | No       | Resource limits (memory, cpu, etc.) |

## Commands

```bash
bunman init                    # Create config file
bunman start <service>         # Start a service
bunman stop <service>          # Stop a service
bunman restart <service>       # Restart a service
bunman logs <service> [-f]     # View logs
bunman status [service]        # Show status
```

## Requirements

- Bun 1.0+
- **Linux**: systemd 240+
- **macOS**: macOS 10.10+
- Root access (or user-mode configuration)

## How It Works

1. Reads `bunman.config.ts`
2. Generates systemd unit files (Linux) or launchd plists (macOS)
3. Uses `systemctl`/`launchctl` to manage services
4. Uses `journalctl` or native logging for logs

No background daemon—bunman is just a CLI. The OS handles process management.

## Generated Unit File

For each service, bunman generates a unit file like:

```ini
[Unit]
Description=bunman service: api
After=network.target

[Service]
Type=simple
WorkingDirectory=/path/to/apps/api
ExecStart=bun run start
Restart=always
RestartSec=3
Environment="NODE_ENV=production"
Environment="PORT=3000"
StandardOutput=journal
StandardError=journal
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```

## User-Mode systemd

For running without root:

```typescript
systemd: { userMode: true }
```

## Monorepo Support

Each app in your config maps to one service:

```typescript
export default {
    apps: {
        api: { cwd: 'apps/api', command: 'bun run start' },
        worker: { cwd: 'apps/worker', command: 'bun run start' },
    },
    systemd: {
        prefix: 'myapp-' // Creates myapp-api, myapp-worker
    }
};
```

## License

MIT
