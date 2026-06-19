import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { getRovingItems, handleRovingKeydown } from './roving-focus';

function buildGroup(count: number, disabledIndexes: number[] = []): HTMLElement {
	const container = document.createElement('div');
	for (let i = 0; i < count; i++) {
		const item = document.createElement('button');
		item.setAttribute('data-roving-item', '');
		item.textContent = `item-${i}`;
		if (disabledIndexes.includes(i)) item.setAttribute('data-disabled', '');
		container.appendChild(item);
	}
	document.body.appendChild(container);
	return container;
}

function keydown(key: string): KeyboardEvent {
	return new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
}

describe('roving focus', () => {
	let container: HTMLElement;

	afterEach(() => container?.remove());

	it('collects only non-disabled roving items', () => {
		container = buildGroup(3, [1]);
		expect(getRovingItems(container)).toHaveLength(2);
	});

	describe('horizontal navigation', () => {
		beforeEach(() => {
			container = buildGroup(3);
			(container.children[0] as HTMLElement).focus();
		});

		it('moves focus right and left', () => {
			handleRovingKeydown(keydown('ArrowRight'), container, { orientation: 'horizontal' });
			expect(document.activeElement).toBe(container.children[1]);
			handleRovingKeydown(keydown('ArrowLeft'), container, { orientation: 'horizontal' });
			expect(document.activeElement).toBe(container.children[0]);
		});

		it('loops from last to first by default', () => {
			(container.children[2] as HTMLElement).focus();
			handleRovingKeydown(keydown('ArrowRight'), container, { orientation: 'horizontal' });
			expect(document.activeElement).toBe(container.children[0]);
		});

		it('stops at the edge when loop is disabled', () => {
			(container.children[2] as HTMLElement).focus();
			handleRovingKeydown(keydown('ArrowRight'), container, {
				orientation: 'horizontal',
				loop: false
			});
			expect(document.activeElement).toBe(container.children[2]);
		});

		it('jumps to first/last with Home/End', () => {
			handleRovingKeydown(keydown('End'), container, { orientation: 'horizontal' });
			expect(document.activeElement).toBe(container.children[2]);
			handleRovingKeydown(keydown('Home'), container, { orientation: 'horizontal' });
			expect(document.activeElement).toBe(container.children[0]);
		});

		it('ignores vertical keys when orientation is horizontal', () => {
			const result = handleRovingKeydown(keydown('ArrowDown'), container, {
				orientation: 'horizontal'
			});
			expect(result).toBeNull();
			expect(document.activeElement).toBe(container.children[0]);
		});
	});

	it('reverses arrow direction in RTL', () => {
		container = buildGroup(3);
		(container.children[0] as HTMLElement).focus();
		handleRovingKeydown(keydown('ArrowLeft'), container, { orientation: 'horizontal', dir: 'rtl' });
		expect(document.activeElement).toBe(container.children[1]);
	});
});
