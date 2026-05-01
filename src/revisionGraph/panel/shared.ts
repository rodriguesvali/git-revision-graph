export const GRAPH_COMMIT_LIMIT = 6000;
export const GRAPH_COMMIT_LIMIT_STEPS = [6000, 12000];
export const GRAPH_MIN_VISIBLE_NODES = 24;
export const GRAPH_GIT_COMMAND_TIMEOUT_MS = 60000;
export const GRAPH_LIMIT_POLICY = {
  initialLimit: GRAPH_COMMIT_LIMIT,
  steppedLimits: GRAPH_COMMIT_LIMIT_STEPS,
  minVisibleNodes: GRAPH_MIN_VISIBLE_NODES,
  graphCommandTimeoutMs: GRAPH_GIT_COMMAND_TIMEOUT_MS
} as const;
