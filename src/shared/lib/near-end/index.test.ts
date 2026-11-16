import { afterEach, describe, expect, it, vi } from 'vitest';
import { nearEnd } from '.';

type Observed = { callback: IntersectionObserverCallback; nodes: Element[]; disconnected: boolean };

let observers: Observed[] = [];

function stubObserver() {
	observers = [];
	vi.stubGlobal(
		'IntersectionObserver',
		class {
			private readonly entry: Observed;
			constructor(callback: IntersectionObserverCallback) {
				this.entry = { callback, nodes: [], disconnected: false };
				observers.push(this.entry);
			}
			observe(node: Element) {
				this.entry.nodes.push(node);
			}
			disconnect() {
				this.entry.disconnected = true;
			}
		}
	);
}

const fire = (observed: Observed, isIntersecting: boolean) =>
	observed.callback([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver);

afterEach(() => vi.unstubAllGlobals());

describe('nearEnd · the next page as the end of a list nears the screen (screen 50, D-W51-29)', () => {
	it('observes its node and calls back each time it starts to show — never while it is out of sight', () => {
		stubObserver();
		const node = document.createElement('div');
		const onNear = vi.fn();
		const action = nearEnd(node, onNear);
		expect(observers).toHaveLength(1);
		expect(observers[0].nodes).toEqual([node]);
		fire(observers[0], false);
		expect(onNear).not.toHaveBeenCalled();
		fire(observers[0], true);
		fire(observers[0], true);
		expect(onNear).toHaveBeenCalledTimes(2);
		action?.destroy?.();
		expect(observers[0].disconnected).toBe(true);
	});

	it('an update names the callback the next sight calls (the caller’s latest)', () => {
		stubObserver();
		const first = vi.fn();
		const next = vi.fn();
		const action = nearEnd(document.createElement('div'), first);
		action?.update?.(next);
		fire(observers[0], true);
		expect(first).not.toHaveBeenCalled();
		expect(next).toHaveBeenCalledTimes(1);
	});

	it('(negative) without an `IntersectionObserver` (the server, an old browser) nothing is observed nor called', () => {
		vi.stubGlobal('IntersectionObserver', undefined);
		const onNear = vi.fn();
		expect(nearEnd(document.createElement('div'), onNear)).toBeUndefined();
		expect(onNear).not.toHaveBeenCalled();
	});
});
