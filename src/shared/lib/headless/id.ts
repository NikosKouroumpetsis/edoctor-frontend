/**
 * Deterministic, monotonically increasing id generator for primitive parts
 * (labels, descriptions, `aria-controls`, etc.).
 *
 * A module-level counter is stable within a single render pass on both server
 * and client as long as components mount in the same order, which is the case
 * for our declarative primitives. Pass an explicit `deterministicId` to opt out
 * of generation (e.g. when the consumer supplied their own `id`).
 */
let counter = 0;

export function useId(deterministicId?: string, prefix = 'ed'): string {
	if (deterministicId) return deterministicId;
	counter += 1;
	return `${prefix}-${counter}`;
}

/** Test-only: reset the counter so id assertions stay deterministic. */
export function __resetIdCounter(): void {
	counter = 0;
}
