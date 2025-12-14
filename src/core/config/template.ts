/**
 * Default config template for `bunpm init`
 */
export const CONFIG_TEMPLATE = `import type { BunpmConfig } from "bunpm";

const config: BunpmConfig = {
  apps: {
    // Example API service
    api: {
      cwd: ".",
      command: "bun run start",
      env: {
        NODE_ENV: "production",
      },
      // user: "www-data",
      // group: "www-data",
    },

    // Example worker service
    // worker: {
    //   cwd: "apps/worker",
    //   command: "bun run start",
    //   env: {
    //     NODE_ENV: "production",
    //   },
    // },
  },

  // Global defaults applied to all apps
  // defaults: {
  //   restart: "always",
  //   restartSec: 3,
  // },

  // systemd settings
  // systemd: {
  //   prefix: "bunpm-",
  //   userMode: false,
  // },
};

export default config;
`;

/**
 * Minimal config template (no comments)
 */
export const CONFIG_TEMPLATE_MINIMAL = `export default {
  apps: {
    api: {
      cwd: ".",
      command: "bun run start",
      env: {
        NODE_ENV: "production",
      },
    },
  },
};
`;

/**
 * Monorepo config template
 */
export const CONFIG_TEMPLATE_MONOREPO = `import type { BunpmConfig } from "bunpm";

const config: BunpmConfig = {
  apps: {
    api: {
      cwd: "apps/api",
      command: "bun run start",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
    worker: {
      cwd: "apps/worker",
      command: "bun run start",
      env: {
        NODE_ENV: "production",
      },
    },
    scheduler: {
      cwd: "apps/scheduler",
      command: "bun run start",
      env: {
        NODE_ENV: "production",
      },
    },
  },

  defaults: {
    restart: "always",
    restartSec: 3,
  },

  systemd: {
    prefix: "myapp-",
  },
};

export default config;
`;
