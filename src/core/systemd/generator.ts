import type { NormalizedAppConfig } from "../../types/config";
import type { SystemdUnit } from "../../types/systemd";

/**
 * Generate a systemd unit file content from app configuration
 */
export function generateUnitFile(app: NormalizedAppConfig): string {
  const unit = buildUnit(app);
  return serializeUnit(unit);
}

/**
 * Build the SystemdUnit structure from app config
 */
function buildUnit(app: NormalizedAppConfig): SystemdUnit {
  return {
    Unit: {
      Description: app.description,
      After: app.after.length > 0 ? app.after : undefined,
      Requires: app.requires.length > 0 ? app.requires : undefined,
    },
    Service: {
      Type: "simple",
      WorkingDirectory: app.cwd,
      ExecStart: app.command,
      Restart: app.restart,
      RestartSec: app.restartSec,
      Environment: formatEnvironment(app.env),
      EnvironmentFile: app.envFile,
      StandardOutput: "journal",
      StandardError: "journal",
      User: app.user,
      Group: app.group,

      // Resource limits (only include if set)
      MemoryMax: app.limits.memory ? `${app.limits.memory}M` : undefined,
      CPUQuota: app.limits.cpu ? `${app.limits.cpu}%` : undefined,
      LimitNOFILE: app.limits.nofile,
      LimitNPROC: app.limits.nproc,
    },
    Install: {
      WantedBy: ["multi-user.target"],
    },
  };
}

/**
 * Format environment variables for systemd
 */
function formatEnvironment(env: Record<string, string>): string[] | undefined {
  const entries = Object.entries(env);
  if (entries.length === 0) return undefined;

  return entries.map(([key, value]) => {
    // Escape quotes in values
    const escaped = value.replace(/"/g, '\\"');
    return `${key}="${escaped}"`;
  });
}

/**
 * Serialize a SystemdUnit to INI format
 */
function serializeUnit(unit: SystemdUnit): string {
  const sections: string[] = [];

  // [Unit] section
  sections.push("[Unit]");
  sections.push(`Description=${unit.Unit.Description}`);

  if (unit.Unit.Documentation) {
    for (const doc of unit.Unit.Documentation) {
      sections.push(`Documentation=${doc}`);
    }
  }

  if (unit.Unit.After) {
    sections.push(`After=${unit.Unit.After.join(" ")}`);
  }

  if (unit.Unit.Requires) {
    sections.push(`Requires=${unit.Unit.Requires.join(" ")}`);
  }

  if (unit.Unit.Wants) {
    sections.push(`Wants=${unit.Unit.Wants.join(" ")}`);
  }

  sections.push("");

  // [Service] section
  sections.push("[Service]");
  sections.push(`Type=${unit.Service.Type}`);
  sections.push(`WorkingDirectory=${unit.Service.WorkingDirectory}`);
  sections.push(`ExecStart=${unit.Service.ExecStart}`);

  if (unit.Service.ExecStop) {
    sections.push(`ExecStop=${unit.Service.ExecStop}`);
  }

  if (unit.Service.ExecReload) {
    sections.push(`ExecReload=${unit.Service.ExecReload}`);
  }

  sections.push(`Restart=${unit.Service.Restart}`);
  sections.push(`RestartSec=${unit.Service.RestartSec}`);

  // Environment variables
  if (unit.Service.Environment) {
    for (const env of unit.Service.Environment) {
      sections.push(`Environment=${env}`);
    }
  }

  if (unit.Service.EnvironmentFile) {
    sections.push(`EnvironmentFile=${unit.Service.EnvironmentFile}`);
  }

  sections.push(`StandardOutput=${unit.Service.StandardOutput}`);
  sections.push(`StandardError=${unit.Service.StandardError}`);

  if (unit.Service.User) {
    sections.push(`User=${unit.Service.User}`);
  }

  if (unit.Service.Group) {
    sections.push(`Group=${unit.Service.Group}`);
  }

  // Resource limits
  if (unit.Service.MemoryMax) {
    sections.push(`MemoryMax=${unit.Service.MemoryMax}`);
  }

  if (unit.Service.CPUQuota) {
    sections.push(`CPUQuota=${unit.Service.CPUQuota}`);
  }

  if (unit.Service.LimitNOFILE !== undefined) {
    sections.push(`LimitNOFILE=${unit.Service.LimitNOFILE}`);
  }

  if (unit.Service.LimitNPROC !== undefined) {
    sections.push(`LimitNPROC=${unit.Service.LimitNPROC}`);
  }

  // Security options
  if (unit.Service.PrivateTmp !== undefined) {
    sections.push(`PrivateTmp=${unit.Service.PrivateTmp}`);
  }

  if (unit.Service.NoNewPrivileges !== undefined) {
    sections.push(`NoNewPrivileges=${unit.Service.NoNewPrivileges}`);
  }

  if (unit.Service.ProtectSystem !== undefined) {
    sections.push(`ProtectSystem=${unit.Service.ProtectSystem}`);
  }

  if (unit.Service.ProtectHome !== undefined) {
    sections.push(`ProtectHome=${unit.Service.ProtectHome}`);
  }

  sections.push("");

  // [Install] section
  sections.push("[Install]");
  sections.push(`WantedBy=${unit.Install.WantedBy.join(" ")}`);

  if (unit.Install.RequiredBy) {
    sections.push(`RequiredBy=${unit.Install.RequiredBy.join(" ")}`);
  }

  if (unit.Install.Alias) {
    for (const alias of unit.Install.Alias) {
      sections.push(`Alias=${alias}`);
    }
  }

  sections.push("");

  return sections.join("\n");
}
