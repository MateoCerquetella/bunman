#!/usr/bin/env bun

import type { CommandContext } from '../types/cli';
import { parseArgs } from './parser';
import { printHelp, printVersion, printCommandHelp } from './help';
import {
    initCommand,
    startCommand,
    stopCommand,
    restartCommand,
    logsCommand,
    statusCommand,
    removeCommand,
    doctorCommand
} from './commands';
import { loadConfig } from '../core/config';
import { BunmanError } from '../utils/errors';
import { logger } from '../utils/logger';
import { getServiceManager, getPlatformName } from '../core/backend';

/**
 * Commands that require a config file
 */
const COMMANDS_REQUIRING_CONFIG = new Set([
    'start',
    'stop',
    'restart',
    'logs',
    'status',
    'remove',
    // Backward compatibility aliases
    'startall',
    'stopall',
    'restartall'
]);

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
    try {
        // Parse CLI arguments
        const args = parseArgs(Bun.argv.slice(2));

        // Handle help and version commands immediately
        if (args.command === 'help') {
            if (args.args[0]) {
                printCommandHelp(args.args[0]);
            } else {
                printHelp();
            }
            return;
        }

        if (args.command === 'version') {
            printVersion();
            return;
        }

        // Check service manager availability for commands that need it
        if (args.command !== 'init' && args.command !== 'doctor') {
            try {
                const serviceManager = getServiceManager();
                const available = await serviceManager.isAvailable();
                if (!available) {
                    throw new BunmanError(
                        `${serviceManager.getName()} is not available`,
                        `bunman requires ${serviceManager.getName()} on ${getPlatformName()}`
                    );
                }
            } catch (error) {
                if (error instanceof BunmanError) {
                    throw error;
                }
                throw new BunmanError(
                    'Service manager not available',
                    error instanceof Error ? error.message : 'Unknown error'
                );
            }
        }

        // Build command context
        const ctx: CommandContext = {
            args,
            cwd: process.cwd()
        };

        // Load config for commands that need it
        if (COMMANDS_REQUIRING_CONFIG.has(args.command)) {
            try {
                ctx.config = await loadConfig(ctx.cwd);
                ctx.configPath = ctx.config.configPath;
            } catch (error) {
                if (error instanceof BunmanError) {
                    throw error;
                }
                throw new BunmanError(
                    'Failed to load configuration',
                    error instanceof Error ? error.message : 'Unknown error'
                );
            }
        }

        // Execute the command
        switch (args.command) {
            case 'init':
                await initCommand(ctx);
                break;
            case 'start':
            case 'startall': // Backward compatibility alias
                await startCommand(ctx);
                break;
            case 'stop':
            case 'stopall': // Backward compatibility alias
                await stopCommand(ctx);
                break;
            case 'restart':
            case 'restartall': // Backward compatibility alias
                await restartCommand(ctx);
                break;
            case 'logs':
                await logsCommand(ctx);
                break;
            case 'status':
                await statusCommand(ctx);
                break;
            case 'remove':
                await removeCommand(ctx);
                break;
            case 'doctor':
                await doctorCommand(ctx);
                break;
            default:
                printHelp();
        }
    } catch (error) {
        handleError(error);
    }
}

/**
 * Handle errors gracefully
 */
function handleError(error: unknown): void {
    if (error instanceof BunmanError) {
        logger.error(error.message);
        if (error.help) {
            logger.dim(`  ${error.help}`);
        }
        process.exit(error.exitCode);
    }

    // Unexpected error
    logger.error('An unexpected error occurred');

    if (error instanceof Error) {
        logger.dim(`  ${error.message}`);

        // Show stack trace in debug mode
        if (process.env['DEBUG'] && error.stack) {
            console.error('');
            console.error(error.stack);
        }
    }

    process.exit(1);
}

// Run the CLI
main();
