import { tick } from 'svelte';
import { move } from '$shared/ui/organisms/image-uploader/lib/reorder';
import { doctorPhotoDropTarget, sameDoctorPhotoOrder } from '$modules/doctor-dashboard/lib/photos';

// A mouse drags once it has left its press by this much (a click stays a click); a finger must first hold still for
// `HOLD_MS` — moved sooner, it is the page being scrolled (U-81.2: below 744 the web is the application's long press).
const MOUSE_SLOP = 4;
const TOUCH_SLOP = 8;
const HOLD_MS = 350;
// A tile without a box (never drawn) is taken by its middle.
const MIDDLE = 1 / 2;

const TILE = '[data-photo-id]';
const GRID = '[data-slot="doctor-photos-grid"]';

type Press = {
	id: string;
	pointer: number;
	touch: boolean;
	node: HTMLElement;
	x: number;
	y: number;
	/** Where in the tile it was taken, as fractions of the tile: the tile follows the pointer by the same spot. */
	fx: number;
	fy: number;
	timer: ReturnType<typeof setTimeout> | undefined;
};

/**
 * Wave 5.2 · screen 78 (D-W52-39): a photo dragged to another place with the pointer — pointer events only, no library.
 * While it is dragged the photos stand in the order it would leave (the tile itself follows the pointer); letting go
 * hands that order over ONCE (`onDrop`), and only if it changed. `Escape`, or a pointer the browser takes back, puts
 * everything as it was. Only the press is heard on the picture; the rest of it on the window. Nothing here reads the width of the screen, and nothing colours under the pointer (U-100).
 */
export function useDoctorPhotoDrag(options: {
	/** The photos' ids in the order they are stored. */
	ids: () => readonly string[];
	onDrop: (ids: string[], movedId: string) => void;
}) {
	let order = $state<string[] | null>(null);
	let lifted = $state<{ id: string; x: number; y: number } | null>(null);
	let press: Press | null = null;

	const tileOf = (node: HTMLElement, id: string) =>
		node.closest(GRID)?.querySelector<HTMLElement>(`[data-photo-id="${id}"]`) ?? null;

	function start() {
		if (!press || lifted) return;
		order = [...options.ids()];
		lifted = { id: press.id, x: 0, y: 0 };
	}

	/** The press ends: the window listens no more, nothing is lifted, the stored order shows. */
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

	/** The tile under the pointer's own spot: its box is where its place is, so the shift is the rest of the way. */
	function follow(clientX: number, clientY: number) {
		if (!press || !lifted) return;
		const tile = tileOf(press.node, press.id);
		if (!tile) return;
		const box = tile.getBoundingClientRect();
		lifted = {
			id: lifted.id,
			x: clientX - press.fx * box.width - (box.left - lifted.x),
			y: clientY - press.fy * box.height - (box.top - lifted.y)
		};
	}

	async function drag(clientX: number, clientY: number) {
		if (!press || !lifted || !order) return;
		const grid = press.node.closest(GRID);
		const tiles = [...(grid?.querySelectorAll<HTMLElement>(TILE) ?? [])].map((tile) => ({
			id: tile.dataset.photoId ?? '',
			box: tile.getBoundingClientRect()
		}));
		const over = doctorPhotoDropTarget({ x: clientX, y: clientY }, tiles, press.id);
		const from = order.indexOf(press.id);
		const to = over === null ? -1 : order.indexOf(over);
		if (from >= 0 && to >= 0 && from !== to) {
			order = move(order, from, to);
			// The tile takes its new place in the page first; only then is its shift measured from it.
			await tick();
		}
		follow(clientX, clientY);
	}

	// The rest of a press is heard on the WINDOW: the tile is moved in the page while it is dragged (which gives up a
	// pointer's capture), and the pointer may be let go anywhere.
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
		void drag(event.clientX, event.clientY);
	}

	function onUp(event: PointerEvent) {
		if (!press || press.pointer !== event.pointerId) return;
		const { id } = press;
		const left = order;
		const dragged = lifted !== null;
		reset();
		if (dragged && left && !sameDoctorPhotoOrder(left, options.ids())) options.onDrop(left, id);
	}

	function onCancel(event: PointerEvent) {
		if (press && press.pointer === event.pointerId) reset();
	}

	return {
		/** The order to draw while a photo is dragged; `null` otherwise (the stored order). */
		get order() {
			return order;
		},
		/** The photo being dragged and how far it stands from its place. */
		get lifted() {
			return lifted;
		},
		/** A press on a photo's picture: the start of what may become a drag. */
		down(event: PointerEvent, id: string) {
			if (press || (event.pointerType === 'mouse' && event.button !== 0)) return;
			const node = event.currentTarget as HTMLElement;
			const box = (node.closest<HTMLElement>(TILE) ?? node).getBoundingClientRect();
			const touch = event.pointerType === 'touch';
			press = {
				id,
				pointer: event.pointerId,
				touch,
				node,
				x: event.clientX,
				y: event.clientY,
				fx: box.width > 0 ? (event.clientX - box.left) / box.width : MIDDLE,
				fy: box.height > 0 ? (event.clientY - box.top) / box.height : MIDDLE,
				timer: touch ? setTimeout(start, HOLD_MS) : undefined
			};
			window.addEventListener('pointermove', onMove);
			window.addEventListener('pointerup', onUp);
			window.addEventListener('pointercancel', onCancel);
		},
		/** `Escape` while a photo is lifted: as it was, nothing sent. */
		cancel() {
			reset();
		},
		/**
		 * On the grid: while a photo is dragged a finger's move is the drag, never the page's scroll (it must be said in a
		 * listener that is not passive), and the long press opens no menu of the browser over the picture.
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

export type DoctorPhotoDrag = ReturnType<typeof useDoctorPhotoDrag>;
