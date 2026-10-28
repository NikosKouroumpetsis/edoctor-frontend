import { untrack } from 'svelte';
import type { Action } from 'svelte/action';
import type { MotionDuration } from '$shared/design/tokens';
import { isMoving, leaveTimeout } from './motion';

export type PresenceState = 'open' | 'closed';

/**
 * Keeps a layer in the DOM while it leaves (U-12.2), so CSS can carry it out: render it while `present`, give its
 * nodes `data-state={state}` (`data-[state=closed]:…` is the way out, `starting:…` the way in) and `inert` while
 * `closing`, and `use:track` every node that leaves with a transition. The layer goes once each tracked node's own
 * transitions have ended (`transitionend` of the node itself, never of a child), at once when nothing moves, or at
 * the token's duration and a grace (`leaveTimeout`) when a transition never reports. Opening again on the way out
 * keeps the same nodes, so the CSS transition turns back from where it is. Create it while a component initialises.
 */
export class Presence {
	#isOpen: () => boolean;
	#timeout: number;
	/** Opened and not yet gone: set on opening, so a close keeps the layer until its leave ends. */
	#held = $state(false);
	#timer: ReturnType<typeof setTimeout> | undefined;
	// Plain bookkeeping, never read by the template: the tracked nodes and those whose leave still runs.
	#nodes: HTMLElement[] = [];
	#pending: HTMLElement[] = [];

	/** What the caller asks for. */
	open = $derived.by(() => this.#isOpen());
	/** In the DOM: open, or on its way out. */
	present = $derived(this.open || this.#held);
	/** The nodes' `data-state`. */
	state: PresenceState = $derived(this.open ? 'open' : 'closed');
	/** On its way out: `inert`, and its CSS takes no press (`data-[state=closed]:pointer-events-none`). */
	closing = $derived(!this.open && this.#held);

	constructor(isOpen: () => boolean, { duration }: { duration: MotionDuration }) {
		this.#isOpen = isOpen;
		this.#timeout = leaveTimeout(duration);
		// After the DOM shows the new state: a close finds the transitions it started on the tracked nodes.
		$effect(() => {
			const open = this.open;
			untrack(() => (open ? this.#arrive() : this.#leave()));
		});
		$effect(() => () => this.#stop());
	}

	/** Every node that leaves with a transition; the layer waits for each one's own `transitionend`. */
	track: Action<HTMLElement> = (node) => {
		this.#nodes.push(node);
		const ended = (event: Event) => {
			if (event.target !== node || !this.#pending.includes(node) || isMoving(node)) return;
			this.#pending = this.#pending.filter((other) => other !== node);
			if (this.#pending.length === 0) this.#finish();
		};
		node.addEventListener('transitionend', ended);
		node.addEventListener('transitioncancel', ended);
		return {
			destroy: () => {
				node.removeEventListener('transitionend', ended);
				node.removeEventListener('transitioncancel', ended);
				this.#nodes = this.#nodes.filter((other) => other !== node);
				this.#pending = this.#pending.filter((other) => other !== node);
			}
		};
	};

	#arrive() {
		this.#stop();
		this.#held = true;
	}

	#leave() {
		if (!this.#held) return;
		this.#stop();
		this.#pending = this.#nodes.filter((node) => node.isConnected && isMoving(node));
		if (this.#pending.length === 0) {
			this.#finish();
			return;
		}
		this.#timer = setTimeout(() => this.#finish(), this.#timeout);
	}

	#finish() {
		this.#stop();
		this.#held = false;
	}

	#stop() {
		clearTimeout(this.#timer);
		this.#timer = undefined;
		this.#pending = [];
	}
}
