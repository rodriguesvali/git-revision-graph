import { inspectRepositoryConfigPath } from './flowConfigPathSafety';

export interface FlowConfigRecoveryServices {
  readonly isCurrent: () => boolean;
  readonly openDocument: (filePath: string) => Promise<void>;
  readonly warn: (message: string) => void;
}

/** Opens only the configured repository file; never creates or rewrites it. */
export async function openFlowConfigForRecovery(
  repositoryPath: string,
  configPath: string,
  services: FlowConfigRecoveryServices
): Promise<void> {
  const inspection = await inspectRepositoryConfigPath(repositoryPath, configPath);
  if (!services.isCurrent()) return;
  if (!inspection.ok) {
    services.warn(`${inspection.message} Check gitRevisionGraph.flowGovernance.configPath in Settings.`);
    return;
  }
  if (!inspection.exists) {
    services.warn('Flow Governance configuration is missing. Enable Flow Governance in View or run Create Flow Governance Config.');
    return;
  }
  try {
    await services.openDocument(inspection.path);
  } catch (error) {
    if (services.isCurrent()) {
      services.warn(`Could not open Flow Governance configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
