import { tick } from 'svelte';
import {
	doctorServiceDropTarget,
	moveDoctorService,
	sameDoctorServiceOrder
} from '$modules/doctor-dashboard/lib/services';

// The photos' rules (D-W52-39): a mouse drags once it has left its press by this much (a click stays a click); a finger
// must first hold still for `HOLD_MS` — moved sooner, it is the page being scrolled (U-81.2: below 744 the web is the
// application's long press).
const MOUSE_SLOP = 4;
const TOUCH_SLOP = 8;
const HOLD_MS = 350;
const MIDDLE = 1 / 2;

const ROW = '[data-service-id]';
const LIST = '[data-slot="doctor-services-list"]';

type Press = {
	id: string;
	pointer: number;
	touch: boolean;
	node: HTMLElement;
	y: number;
	x: number;
	/** Where in the row it was taken, as a fraction of its height: the row follows the pointer by the same spot. */
	fy: number;
	timer: ReturnType<typeof setTimeout> | undefined;
};

/**
 * Wave 5.2 · screen 83 (D-W52-81, the photos' way of D-W52-39 in ONE column): a service dragged up or down with the
 * pointer — pointer events only, no library. While it is dragged the rows stand in the order it would leave (the row
 * itself follows the pointer); letting go hands that order over ONCE (`onDrop`), and only if it changed. `Escape`, or a
 * pointer the browser takes back, puts everything as it was. A row is a link: the click that ends a drag opens nothing.
 * Nothing colours under the pointer (U-100).
 */
export function useDoctorServiceDrag(options: {
	/** The services' ids in the order they are stored. */
	ids: () => readonly string[];
	onDrop: (ids: string[], movedId: string) => void;
}) {
	let order = $state<string[] | null>(null);
	let lifted = $state<{ id: string; y: number } | null>(null);
	let press: Press | null = null;
	// A drag just ended on a link: the click the browser sends after it is swallowed, once.
	let dropped = false;

	const rowOf = (node: HTMLElement, id: string) =>
		node.closest(LIST)?.querySelector<HTMLElement>(`[data-service-id="${id}"]`) ?? null;

	function start() {
		if (!press || lifted) return;
		order = [...options.ids()];
		lifted = { id: press.id, y: 0 };
	}

	function reset() {
		if (press?.timer) clearTimeout(press.timer);
		if (press) {
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
			window.removeEventListener('pointercancel', onCancel);
		}
		press = null;
		order = null;
		lifted = null;
	}

	/** The row under the pointer's own spot: its box is where its place is, so the shift is the rest of the way. */
	function follow(clientY: number) {
		if (!press || !lifted) return;
		const row = rowOf(press.node, press.id);
		if (!row) return;
		const box = row.getBoundingClientRect();
		lifted = { id: lifted.id, y: clientY - press.fy * box.height - (box.top - lifted.y) };
	}

	async function drag(clientY: number) {
		if (!press || !lifted || !order) return;
		const list = press.node.closest(LIST);
		const rows = [...(list?.querySelectorAll<HTMLElement>(ROW) ?? [])].map((row) => {
			const box = row.getBoundingClientRect();
			return { id: row.dataset.serviceId ?? '', top: box.top, bottom: box.bottom };
		});
		const over = doctorServiceDropTarget(clientY, rows, press.id);
		const from = order.indexOf(press.id);
		const to = over === null ? -1 : order.indexOf(over);
		if (from >= 0 && to >= 0 && from !== to) {
			order = moveDoctorService(order, from, to);
			await tick();
		}
		follow(clientY);
	}

	function onMove(event: PointerEvent) {
		if (!press || press.pointer !== event.pointerId) return;
		if (!lifted) {
			const far = Math.hypot(event.clientX - press.x, event.clientY - press.y);
			if (press.touch) {
				if (far > TOUCH_SLOP) reset();
				return;
			}
			if (far <= MOUSE_SLOP) return;
			start();
		}
		void drag(event.clientY);
	}

	function onUp(event: PointerEvent) {
		if (!press || press.pointer !== event.pointerId) return;
		const { id } = press;
		const left = order;
		const dragged = lifted !== null;
		reset();
		if (!dragged) return;
		dropped = true;
		setTimeout(() => (dropped = false), 0);
		if (left && !sameDoctorServiceOrder(left, options.ids())) options.onDrop(left, id);
	}

	function onCancel(event: PointerEvent) {
		if (press && press.pointer === event.pointerId) reset();
	}

	return {
		/** The order to draw while a service is dragged; `null` otherwise (the stored order). */
		get order() {
			return order;
		},
		/** The service being dragged and how far it stands from its place. */
		get lifted() {
			return lifted;
		},
		/** A press on a row: the start of what may become a drag. */
		down(event: PointerEvent, id: string) {
			if (press || (event.pointerType === 'mouse' && event.button !== 0)) return;
			const node = event.currentTarget as HTMLElement;
			const box = (node.closest<HTMLElement>(ROW) ?? node).getBoundingClientRect();
			const touch = event.pointerType === 'touch';
			press = {
				id,
				pointer: event.pointerId,
				touch,
				node,
				x: event.clientX,
				y: event.clientY,
				fy: box.height > 0 ? (event.clientY - box.top) / box.height : MIDDLE,
				timer: touch ? setTimeout(start, HOLD_MS) : undefined
			};
			window.addEventListener('pointermove', onMove);
			window.addEventListener('pointerup', onUp);
			window.addEventListener('pointercancel', onCancel);
		},
		/** The click after a drag's end opens nothing (the row is a link). */
		click(event: MouseEvent) {
			if (!dropped) return;
			dropped = false;
			event.preventDefault();
		},
		/** `Escape` while a service is lifted: as it was, nothing sent. */
		cancel() {
			reset();
		},
		/**
		 * On the list: while a service is dragged a finger's move is the drag, never the page's scroll (said in a listener
		 * that is not passive), and the long press opens no menu of the browser over the link.
		 */
		guard(node: HTMLElement) {
			const hold = (event: Event) => {
				if (lifted) event.preventDefault();
			};
			const menu = (event: Event) => {
				if (press?.touch) event.preventDefault();
			};
			node.addEventListener('touchmove', hold, { passive: false });
			node.addEventListener('contextmenu', menu);
			return {
				destroy() {
					node.removeEventListener('touchmove', hold);
					node.removeEventListener('contextmenu', menu);
					reset();
				}
			};
		}
	};
}

export type DoctorServiceDrag = ReturnType<typeof useDoctorServiceDrag>;
