import { describe, expect, it, afterEach, vi } from 'vitest';
import { dismissable } from './dismissable';

function mountLayer(): { layer: HTMLElement; outside: HTMLElement; trigger: HTMLElement } {
	const layer = document.createElement('div');
	const inner = document.createElement('button');
	layer.appendChild(inner);
	const outside = document.createElement('div');
	const trigger = document.createElement('button');
	document.body.append(layer, outside, trigger);
	return { layer, outside, trigger };
}

describe('dismissable action', () => {
	const created: HTMLElement[] = [];
	afterEach(() => {
		created.forEach((el) => el.remove());
		created.length = 0;
	});

	it('dismisses on outside pointer-down but not inside', () => {
		const { layer, outside } = mountLayer();
		created.push(layer, outside);
		const onDismiss = vi.fn();
		const action = dismissable(layer, { onDismiss });

		layer.firstChild!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
		expect(onDismiss).not.toHaveBeenCalled();

		outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
		expect(onDismiss).toHaveBeenCalledTimes(1);
		action?.destroy?.();
	});

	it('does not dismiss when the pointer-down hits an ignored element (trigger)', () => {
		const { layer, trigger } = mountLayer();
		created.push(layer, trigger);
		const onDismiss = vi.fn();
		const action = dismissable(layer, { onDismiss, ignore: [trigger] });

		trigger.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
		expect(onDismiss).not.toHaveBeenCalled();
		action?.destroy?.();
	});

	it('dismisses on Escape', () => {
		const { layer } = mountLayer();
		created.push(layer);
		const onDismiss = vi.fn();
		const action = dismissable(layer, { onDismiss });
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		expect(onDismiss).toHaveBeenCalledTimes(1);
		action?.destroy?.();
	});

	it('stops reacting after destroy / when disabled', () => {
		const { layer, outside } = mountLayer();
		created.push(layer, outside);
		const onDismiss = vi.fn();
		const action = dismissable(layer, { onDismiss });
		action?.destroy?.();
		outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
		expect(onDismiss).not.toHaveBeenCalled();
	});
});
