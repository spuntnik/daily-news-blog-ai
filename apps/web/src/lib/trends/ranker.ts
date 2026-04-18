import type { TrendSignal } from "./types";

export function scoreSignal(signal: TrendSignal) {
  return (
    signal.freshnessScore * 0.35 +
    signal.relevanceScore * 0.4 +
    signal.confidenceScore * 0.25
  );
}

export function rankSignals(signals: TrendSignal[]) {
  return [...signals].sort((a, b) => scoreSignal(b) - scoreSignal(a));
}
