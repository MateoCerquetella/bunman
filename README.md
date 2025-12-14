# bunpm

> Bun-native process manager powered by systemd

bunpm is a PM2-style CLI that provides a developer-friendly experience for managing long-running Bun applications by generating and managing systemd services.

## Why bunpm?

| PM2 | bunpm |
|-----|-------|
| JS daemon | OS-level systemd |
| Node dependency | Bun-native |
| Reimplements process management | Uses battle-tested systemd |
| Fragile under load | Extremely reliable |
| Weak monorepo support | First-class monorepo support |

**bunpm is not a PM2 replacement** — it's a Bun-native DX layer for systemd.

## Installation

```bash
bun add -g bunpm
```

## Quick Start

```bash
# Initialize config
bunpm init

# Edit bunpm.config.ts to configure your services

# Start a service
bunpm start api

# View logs
bunpm logs api -f

# Check status
bunpm status

# Stop a service
bunpm stop api
```

## Configuration

Create a `bunpm.config.ts` in your project root:

```typescript
export default {
  apps: {
    api: {
      cwd: "apps/api",
      command: "bun run start",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
      user: "www-data",
      group: "www-data",
    },
    worker: {
      cwd: "apps/worker",
      command: "bun run start",
      env: {
        NODE_ENV: "production",
      },
    },
  },

  // Global defaults (optional)
  defaults: {
    restart: "always",
    restartSec: 3,
  },

  // systemd settings (optional)
  systemd: {
    prefix: "myapp-",  // Service name prefix
    userMode: false,   // Use system-level systemd
  },
};
```

### Configuration Options

#### App Configuration

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `cwd` | string | Yes | Working directory (relative to config or absolute) |
| `command` | string | Yes | Command to execute (e.g., `"bun run start"`) |
| `env` | object | No | Environment variables |
| `user` | string | No | Unix user to run as |
| `group` | string | No | Unix group to run as |
| `description` | string | No | Service description |
| `restart` | string | No | Restart policy: `"always"`, `"on-failure"`, `"on-abnormal"`, `"no"` |
| `restartSec` | number | No | Restart delay in seconds (default: 3) |
| `after` | string[] | No | systemd units to start after |
| `requires` | string[] | No | Required systemd units |
| `limits` | object | No | Resource limits |

#### Resource Limits

```typescript
limits: {
  memory: 512,   // Max memory in MB
  cpu: 100,      // CPU quota percentage (100 = 1 core)
  nofile: 65535, // Max file descriptors
  nproc: 4096,   // Max processes
}
```

## Commands

### `bunpm init`

Create a new configuration file.

```bash
bunpm init              # Default template with comments
bunpm init --minimal    # Minimal template (no comments)
bunpm init --monorepo   # Monorepo-style template
```

### `bunpm start <service>`

Start a service. Generates systemd unit file, enables on boot, and starts.

```bash
bunpm start api
```

### `bunpm stop <service>`

Stop a running service.

```bash
bunpm stop api
```

### `bunpm restart <service>`

Restart a service. Updates the systemd unit file if config changed.

```bash
bunpm restart api
```

### `bunpm logs <service>`

View service logs from journalctl.

```bash
bunpm logs api          # Last 50 lines
bunpm logs api -f       # Follow (stream) logs
bunpm logs api -n 100   # Last 100 lines
bunpm logs api --since "1 hour ago"
```

Options:
- `-f, --follow` — Stream logs continuously
- `-n, --lines <n>` — Number of lines (default: 50)
- `--since <time>` — Show logs since timestamp
- `--until <time>` — Show logs until timestamp
- `-r, --reverse` — Reverse chronological order

### `bunpm status`

Show status of all services.

```bash
bunpm status        # All services
bunpm status api    # Detailed status for one service
```

## Requirements

- **Linux** with systemd 240+
- **Bun** 1.0+
- **Root access** for system-level services (or configure user-mode systemd)

## How It Works

1. bunpm reads your `bunpm.config.ts`
2. Generates systemd unit files in `/etc/systemd/system/`
3. Uses `systemctl` to enable and start services
4. Uses `journalctl` for log viewing

**No background daemon** — bunpm is just a CLI, systemd handles process management.

## Generated Unit File

For each service, bunpm generates a unit file like:

```ini
[Unit]
Description=bunpm service: api
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

For running without root, enable user-mode systemd:

```typescript
export default {
  apps: { ... },
  systemd: {
    userMode: true,
  },
};
```

Unit files go to `~/.config/systemd/user/` and are managed with `systemctl --user`.

## Monorepo Support

bunpm is designed for monorepos. Each app in your config maps to one systemd service:

```typescript
export default {
  apps: {
    api: { cwd: "apps/api", command: "bun run start" },
    worker: { cwd: "apps/worker", command: "bun run start" },
    scheduler: { cwd: "apps/scheduler", command: "bun run start" },
  },
  systemd: {
    prefix: "myapp-",  // Creates myapp-api, myapp-worker, myapp-scheduler
  },
};
```

Typical workflow:
```bash
bun run turbo run build
bunpm restart api
```

## License

MIT
