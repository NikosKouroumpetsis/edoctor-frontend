/** U-67.1 Π2: a sheet follows the finger, and closes past this much or on a quick move down. */
const CLOSES_PAST = 96;
const CLOSES_FASTER_THAN = 0.6;

/**
 * The bar of a sheet that one drags down to close. Its handle shows only on the sheet (CSS): from 744, where it is not
 * laid out, there is nothing to drag. A press on a button of the bar stays the button's.
 */
export class SheetDrag {
	/** The handle: bound by the caller. */
	handle = $state<HTMLElement | null>(null);
	/** How far the finger has taken the sheet; `null` while nobody drags. */
	dragged = $state<number | null>(null);

	#start = { y: 0, at: 0 };
	#onClose: () => void;

	constructor(onClose: () => void) {
		this.#onClose = onClose;
	}

	onpointerdown = (event: PointerEvent) => {
		if (!this.handle || this.handle.getClientRects().length === 0) return;
		if (event.target instanceof Element && event.target.closest('button')) return;
		this.#start = { y: event.clientY, at: event.timeStamp };
		this.dragged = 0;
		if (event.currentTarget instanceof Element)
			event.currentTarget.setPointerCapture?.(event.pointerId);
	};

	onpointermove = (event: PointerEvent) => {
		if (this.dragged !== null) this.dragged = Math.max(0, event.clientY - this.#start.y);
	};

	onpointerup = (event: PointerEvent) => {
		if (this.dragged === null) return;
		const speed = this.dragged / Math.max(1, event.timeStamp - this.#start.at);
		const closing = this.dragged > CLOSES_PAST || speed > CLOSES_FASTER_THAN;
		this.dragged = null;
		if (closing) this.#onClose();
	};

	onpointercancel = () => {
		this.dragged = null;
	};
}
