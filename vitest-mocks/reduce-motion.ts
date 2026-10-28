import { onTestFinished, vi } from 'vitest';

/**
 * Reduced motion for the rest of one test. The setup's `matchMedia` is a `vi.fn`, so a `vi.spyOn` on it would
 * outlive the test (its implementation survives `restoreAllMocks`): the function is swapped and put back instead.
 * The list it returns has the setup's shape (`vitest-setup-client.ts`), listeners included, so a unit that
 * listens for a change of the query works under reduced motion too (review R1 of dyad 3, NIT-3).
 */
export function reduceMotion(): void {
	const original = window.matchMedia;
	window.matchMedia = ((query: string) => ({
		matches: query.includes('reduce'),
		media: query,
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		addListener: vi.fn(),
		removeListener: vi.fn(),
		dispatchEvent: vi.fn()
	})) as unknown as typeof window.matchMedia;
	onTestFinished(() => {
		window.matchMedia = original;
	});
}
