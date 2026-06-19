/**
 * Vitest setup for component/DOM tests.
 *
 * Registers `@testing-library/jest-dom` matchers (e.g. `toBeInTheDocument`,
 * `toHaveAttribute`) and provides small jsdom shims for browser APIs that our
 * headless primitives rely on but jsdom does not implement.
 */
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/svelte';

// Svelte Testing Library does not auto-clean on Vitest; do it ourselves.
afterEach(() => {
	cleanup();
});

// jsdom lacks these; several headless primitives (overlays, tooltips) touch them.
if (typeof window !== 'undefined') {
	if (!window.matchMedia) {
		window.matchMedia = vi.fn().mockImplementation((query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
			dispatchEvent: vi.fn()
		}));
	}

	if (!window.ResizeObserver) {
		window.ResizeObserver = class {
			observe() {}
			unobserve() {}
			disconnect() {}
		};
	}

	if (!Element.prototype.scrollIntoView) {
		Element.prototype.scrollIntoView = vi.fn();
	}

	// jsdom lacks the Web Animations API used by Svelte transitions (slide/fade).
	// Resolve immediately so intro/outro transitions "finish" and elements that
	// transition out are actually removed during tests.
	if (!Element.prototype.animate) {
		Element.prototype.animate = function animate() {
			const anim: Record<string, unknown> = {
				onfinish: null,
				oncancel: null,
				cancel() {},
				finish() {},
				play() {},
				pause() {},
				reverse() {},
				addEventListener() {},
				removeEventListener() {},
				finished: Promise.resolve(),
				currentTime: 0,
				playState: 'finished'
			};
			// Fire onfinish after Svelte assigns its handler (next macrotask).
			setTimeout(() => {
				if (typeof anim.onfinish === 'function') (anim.onfinish as () => void)();
			}, 0);
			return anim as unknown as Animation;
		};
	}

	// jsdom does not implement PointerEvent capture APIs used by Bits-style triggers.
	if (!Element.prototype.hasPointerCapture) {
		Element.prototype.hasPointerCapture = () => false;
	}
	if (!Element.prototype.setPointerCapture) {
		Element.prototype.setPointerCapture = () => {};
	}
	if (!Element.prototype.releasePointerCapture) {
		Element.prototype.releasePointerCapture = () => {};
	}
}
