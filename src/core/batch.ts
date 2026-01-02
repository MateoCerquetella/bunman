import type { NormalizedAppConfig } from "../types/config";
import type { ServiceManager } from "../types/backend";
import type { ServiceState } from "../types/service";
import { logger } from "../utils/logger";
import { ServiceNotFoundError } from "../utils/errors";

/**
 * Result of a batch operation on a single service
 */
export interface BatchResult {
  name: string;
  success: boolean;
  skipped: boolean;
  error?: string;
}

/**
 * Summary of a batch operation
 */
export interface BatchSummary {
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  results: BatchResult[];
}

/**
 * Options for batch operations
 */
export interface BatchOperationOptions {
  /** Human-readable verb (e.g., "Starting", "Stopping") */
  presentVerb: string;

  /** Human-readable past tense (e.g., "started", "stopped") */
  pastVerb: string;

  /** Execute the operation on a single service */
  execute: (
    name: string,
    app: NormalizedAppConfig,
    serviceManager: ServiceManager
  ) => Promise<void>;

  /** Optional: Check if service should be skipped (returns true to skip) */
  shouldSkip?: (
    name: string,
    app: NormalizedAppConfig,
    serviceManager: ServiceManager
  ) => Promise<boolean>;

  /** Optional: Custom message when service is skipped */
  skipMessage?: string;

  /** Optional: Verify success after execution (returns list of acceptable states) */
  successStates?: ServiceState[];
}

/**
 * Validate that all service names exist in config
 */
export function validateServiceNames(
  serviceNames: string[],
  apps: Record<string, NormalizedAppConfig>
): void {
  const invalidServices = serviceNames.filter((name) => !apps[name]);
  if (invalidServices.length > 0) {
    throw new ServiceNotFoundError(invalidServices[0]!, Object.keys(apps));
  }
}

/**
 * Execute a batch operation on multiple services
 */
export async function executeBatch(
  services: Array<[string, NormalizedAppConfig]>,
  serviceManager: ServiceManager,
  options: BatchOperationOptions
): Promise<BatchSummary> {
  const results: BatchResult[] = [];
  const successStates = options.successStates ?? ["active", "activating"];

  logger.info(`${options.presentVerb} ${services.length} service(s)...`);
  console.log("");

  for (const [name, app] of services) {
    // Check if should skip
    if (options.shouldSkip) {
      const skip = await options.shouldSkip(name, app, serviceManager);
      if (skip) {
        logger.dim(`  ${name} ${options.skipMessage ?? "skipped"}`);
        results.push({ name, success: false, skipped: true });
        continue;
      }
    }

    try {
      logger.step(`${options.presentVerb} ${name}...`);
      await options.execute(name, app, serviceManager);

      // Verify status
      const status = await serviceManager.getStatus(app.serviceName);
      const success = successStates.includes(status.state);

      if (success) {
        logger.success(`  ${name} ${options.pastVerb}`);
        results.push({ name, success: true, skipped: false });
      } else {
        logger.warn(`  ${name} may not have ${options.pastVerb} correctly`);
        results.push({ name, success: false, skipped: false });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error(`  ${name} failed: ${errorMessage}`);
      results.push({ name, success: false, skipped: false, error: errorMessage });
    }
  }

  console.log("");

  const summary = summarizeBatch(results);
  printBatchSummary(summary, options.pastVerb);

  return summary;
}

/**
 * Summarize batch results
 */
function summarizeBatch(results: BatchResult[]): BatchSummary {
  return {
    total: results.length,
    succeeded: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success && !r.skipped).length,
    skipped: results.filter((r) => r.skipped).length,
    results,
  };
}

/**
 * Print batch summary
 */
function printBatchSummary(summary: BatchSummary, pastVerb: string): void {
  const { total, succeeded, failed, skipped } = summary;
  const actualAttempted = total - skipped;

  if (failed === 0) {
    if (skipped === total) {
      logger.info(`All services were already ${pastVerb}`);
    } else if (succeeded === 0 && skipped > 0) {
      logger.info(`All specified services were already ${pastVerb}`);
    } else {
      logger.success(`All ${succeeded} service(s) ${pastVerb} successfully`);
    }
  } else {
    const capitalizedVerb = pastVerb.charAt(0).toUpperCase() + pastVerb.slice(1);
    logger.warn(
      `${capitalizedVerb} ${succeeded}/${actualAttempted} services (${failed} failed)`
    );
  }
}
