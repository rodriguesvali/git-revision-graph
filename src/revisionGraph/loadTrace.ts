export interface RevisionGraphLoadTraceEvent {
  readonly phase: string;
  readonly durationMs: number;
  readonly detail?: string;
}

export type RevisionGraphLoadTraceSink = (event: RevisionGraphLoadTraceEvent) => void;

export function nowMs(): number {
  return Date.now();
}

export function traceDuration(
  trace: RevisionGraphLoadTraceSink | undefined,
  phase: string,
  startedAt: number,
  detail?: string
): void {
  if (!trace) {
    return;
  }

  trace({
    phase,
    durationMs: Math.max(0, nowMs() - startedAt),
    detail
  });
}
