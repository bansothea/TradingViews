import type { Strategy } from "./strategy";

/**
 * The strategy registry.
 *
 * Adding a strategy is one import and one array entry. Nothing in the engine
 * core changes, which is the whole point: the cost of the tenth strategy
 * should be the same as the cost of the second.
 */

const registry: Strategy[] = [];

/** Registers a strategy, rejecting duplicate ids before they cause confusion. */
export function register(strategy: Strategy): void {
  const clash = registry.find((s) => s.id === strategy.id);
  if (clash) {
    throw new Error(
      `Strategy id "${strategy.id}" is already registered (version ${clash.version}). ` +
        `Ids are stable identifiers for outcome attribution -- use a new id, or bump the version.`
    );
  }
  registry.push(strategy);
}

/** Every registered strategy, in registration order. */
export function all(): readonly Strategy[] {
  return registry;
}

/** Lookup by id, for replaying a stored setup under the strategy that made it. */
export function byId(id: string): Strategy | undefined {
  return registry.find((s) => s.id === id);
}

/** Test seam. Never call this from application code. */
export function reset(): void {
  registry.length = 0;
}
