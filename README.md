# bunman

> A Bun-native manager for long-running services, tasks, and workers

**bunman** is a developer-friendly CLI that brings excellent DX to systemd-based process management. It's built exclusively for Bun and provides a clean interface for managing services, background jobs, and workers without reimplementing infrastructure.

## What is bunman?

**bunman** is:
- ✅ A Bun-native manager for long-running services, tasks, and workers
- ✅ A DX layer over systemd — not a reimplementation of infrastructure
- ✅ Built for production deployments on Linux systems
- ✅ Designed with first-class monorepo support

**bunman is NOT**:
- ❌ A package manager
- ❌ A build tool
- ❌ A PM2 clone or replacement

## Why bunman?

| PM2 | bunman |
|-----|-------|
| JavaScript daemon | OS-level systemd |
| Node dependency | Bun-native |
| Reimplements process management | Uses battle-tested systemd |
| Fragile under load | Extremely reliable |
| Weak monorepo support | First-class monorepo support |

**Philosophy**: Small surface area. Strong guarantees. Leave infrastructure to the OS.

## Installation

```bash
bun add -g bunman
```

## Quick Start

```bash
# Initialize config
bunman init

# Edit bunman.config.ts to configure your services

# Start a service
bunman start api

# View logs
bunman logs api -f

# Check status
bunman status

# Stop a service
bunman stop api
```

## Configuration

Create a `bunman.config.ts` in your project root:

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

### `bunman init`

Create a new configuration file.

```bash
bunman init              # Default template with comments
bunman init --minimal    # Minimal template (no comments)
bunman init --monorepo   # Monorepo-style template
```

### `bunman start <service>`

Start a service. Generates systemd unit file, enables on boot, and starts.

```bash
bunman start api
```

### `bunman stop <service>`

Stop a running service.

```bash
bunman stop api
```

### `bunman restart <service>`

Restart a service. Updates the systemd unit file if config changed.

```bash
bunman restart api
```

### `bunman logs <service>`

View service logs from journalctl.

```bash
bunman logs api          # Last 50 lines
bunman logs api -f       # Follow (stream) logs
bunman logs api -n 100   # Last 100 lines
bunman logs api --since "1 hour ago"
```

Options:
- `-f, --follow` — Stream logs continuously
- `-n, --lines <n>` — Number of lines (default: 50)
- `--since <time>` — Show logs since timestamp
- `--until <time>` — Show logs until timestamp
- `-r, --reverse` — Reverse chronological order

### `bunman status`

Show status of all services.

```bash
bunman status        # All services
bunman status api    # Detailed status for one service
```

## Requirements

- **Linux** with systemd 240+
- **Bun** 1.0+
- **Root access** for system-level services (or configure user-mode systemd)

## How It Works

1. bunman reads your `bunman.config.ts`
2. Generates systemd unit files in `/etc/systemd/system/`
3. Uses `systemctl` to enable and start services
4. Uses `journalctl` for log viewing

**No background daemon** — bunman is just a CLI, systemd handles process management.

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

bunman is designed for monorepos. Each app in your config maps to one systemd service:

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
bunman restart api
```

## License

MIT
