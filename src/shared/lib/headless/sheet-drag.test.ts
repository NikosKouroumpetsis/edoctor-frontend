import { describe, expect, it, vi } from 'vitest';
import { SheetDrag } from './sheet-drag.svelte';

const handle = (laidOut = true) =>
	({ getClientRects: () => (laidOut ? [{}] : []) }) as unknown as HTMLElement;
const pointer = (clientY: number, timeStamp: number) =>
	({
		clientY,
		timeStamp,
		target: null,
		currentTarget: null,
		pointerId: 1
	}) as unknown as PointerEvent;

describe('SheetDrag (U-67.1 Π2)', () => {
	it('past 96 it closes, and it follows the finger on the way', () => {
		const close = vi.fn();
		const drag = new SheetDrag(close);
		drag.handle = handle();
		drag.onpointerdown(pointer(100, 0));
		drag.onpointermove(pointer(150, 500));
		expect(drag.dragged).toBe(50);
		drag.onpointermove(pointer(210, 2000));
		drag.onpointerup(pointer(210, 2000));
		expect(close).toHaveBeenCalledOnce();
		expect(drag.dragged).toBeNull();
	});

	it('a slow short pull goes back; a quick one closes', () => {
		const close = vi.fn();
		const drag = new SheetDrag(close);
		drag.handle = handle();
		drag.onpointerdown(pointer(100, 0));
		drag.onpointermove(pointer(130, 1000));
		drag.onpointerup(pointer(130, 1000));
		expect(close).not.toHaveBeenCalled();
		drag.onpointerdown(pointer(100, 0));
		drag.onpointermove(pointer(150, 20));
		drag.onpointerup(pointer(150, 20));
		expect(close).toHaveBeenCalledOnce();
	});

	it('(negative) from 744, where the handle is not laid out, there is nothing to drag', () => {
		const close = vi.fn();
		const drag = new SheetDrag(close);
		drag.handle = handle(false);
		drag.onpointerdown(pointer(100, 0));
		expect(drag.dragged).toBeNull();
		drag.onpointerup(pointer(400, 10));
		expect(close).not.toHaveBeenCalled();
	});

	it('(negative) a cancelled drag closes nothing', () => {
		const close = vi.fn();
		const drag = new SheetDrag(close);
		drag.handle = handle();
		drag.onpointerdown(pointer(100, 0));
		drag.onpointermove(pointer(400, 10));
		drag.onpointercancel();
		drag.onpointerup(pointer(400, 10));
		expect(close).not.toHaveBeenCalled();
	});
});
