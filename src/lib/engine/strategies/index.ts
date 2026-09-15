import type { Strategy } from "../strategy";
import { register } from "../registry";
import { ictSweepMss } from "./ict-sweep-mss";

/**
 * The strategy catalogue.
 *
 * Adding a strategy is an import and an array entry -- nothing in the engine
 * core changes. Registration is an explicit call rather than an import side
 * effect, so tests can build their own catalogues without fighting module
 * caching.
 */
export const ALL_STRATEGIES: readonly Strategy[] = [ictSweepMss];

/** Populates the lookup registry. Call once at application start. */
export function registerAll(): void {
  for (const strategy of ALL_STRATEGIES) register(strategy);
}

export { ictSweepMss };
