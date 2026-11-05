import { createContext } from '$shared/lib/headless';
import type { IoniconName } from '$shared/ui/icons/ionicon';

/** What the card starts with: a photo (the doctor's, 40), or a glyph of the kit. */
export type ToastLeading =
	| { kind: 'photo'; src: string; alt?: string }
	| { kind: 'glyph'; name: IoniconName };

export type ToastTone = 'info' | 'danger';

/** What it clears: the capsule (the default, every page with it) or a page's own bottom bar (the booking bar). */
export type ToastLift = 'tab-bar' | 'page-bar';

export type ToastOptions = {
	/** The words, already localized: the kit writes none of its own. */
	message: string;
	tone?: ToastTone;
	leading?: ToastLeading;
	/** One action in its 48 target; pressing it closes the card. */
	action?: { label: string; onPress: () => void };
	/** In ms; 4 s by default, 6 s for a failure (it asks for a decision). */
	duration?: number;
	lift?: ToastLift;
};

export type ToastEntry = ToastOptions & { id: number };

const DURATION_INFO = 4000;
const DURATION_DANGER = 6000;

/**
 * The page tree's one toast (`20-favorites/proto-notes.md` §Π6): one at a time, the new one takes the old one's place;
 * it waits while the pointer or the focus is on it. Created per tree in a provider and read through the context,
 * never a module singleton, so nothing of one visitor's request can reach another's on the server.
 */
export class ToastState {
	current = $state.raw<ToastEntry | null>(null);

	#nextId = 0;
	#timer: ReturnType<typeof setTimeout> | undefined;
	#remaining = 0;
	#startedAt = 0;
	#paused = false;

	/** Shows `options` in place of whatever shows; its id, for a caller that may take it back. */
	show(options: ToastOptions): number {
		const id = ++this.#nextId;
		this.current = { ...options, id };
		this.#paused = false;
		this.#remaining =
			options.duration ?? (options.tone === 'danger' ? DURATION_DANGER : DURATION_INFO);
		this.#arm();
		return id;
	}

	/** Closes the card, or only the one named (a late answer must not close a newer toast). */
	dismiss(id?: number) {
		if (id !== undefined && this.current?.id !== id) return;
		this.#stop();
		this.current = null;
	}

	/** The pointer or the focus went onto the card: its time stops. */
	pause() {
		if (!this.current || this.#paused) return;
		this.#paused = true;
		this.#remaining = Math.max(0, this.#remaining - (Date.now() - this.#startedAt));
		this.#stop();
	}

	/** They left: the time left runs on. */
	resume() {
		if (!this.current || !this.#paused) return;
		this.#paused = false;
		this.#arm();
	}

	#arm() {
		this.#stop();
		this.#startedAt = Date.now();
		this.#timer = setTimeout(() => this.dismiss(), this.#remaining);
	}

	#stop() {
		if (this.#timer !== undefined) clearTimeout(this.#timer);
		this.#timer = undefined;
	}
}

/** The tree's toast: the frame sets it once; `getToastsOptional` is `null` outside a frame (a slice in a test). */
export const [getToasts, setToasts, getToastsOptional] = createContext<ToastState>('Toasts');
