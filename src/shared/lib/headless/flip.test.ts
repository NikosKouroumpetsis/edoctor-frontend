import { afterEach, describe, expect, it } from 'vitest';
import { measureFlip, playFlip } from './flip';

function child(key: string, left: number, top: number) {
	const node = document.createElement('div');
	node.dataset.flipKey = key;
	node.getBoundingClientRect = () => ({ left, top }) as DOMRect;
	return node;
}

afterEach(() => {
	document.body.textContent = '';
});

describe('flip', () => {
	it('measures every keyed child, and only those', () => {
		const list = document.createElement('div');
		list.append(child('a', 10, 20), document.createElement('span'));
		expect([...measureFlip(list).entries()]).toEqual([['a', { left: 10, top: 20 }]]);
	});

	it('U-12.2: leaves the move to the CSS: no inline style stays on a child that moved', () => {
		const list = document.createElement('div');
		const moved = child('a', 0, 100);
		const written: string[] = [];
		const style = moved.style;
		const set = Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, 'transform');
		expect(set === undefined || typeof style.transform === 'string').toBe(true);
		list.append(moved);
		Object.defineProperty(moved, 'offsetWidth', {
			get() {
				written.push(style.transform);
				return 0;
			}
		});
		playFlip(list, new Map([['a', { left: 0, top: 300 }]]));
		expect(written).toEqual(['translate(0px, 200px)']);
		expect(style.transform).toBe('');
		expect(style.transition).toBe('');
	});

	it('leaves alone a child that stayed, and one it does not know', () => {
		const list = document.createElement('div');
		const stayed = child('a', 0, 0);
		const fresh = child('b', 0, 50);
		list.append(stayed, fresh);
		let reads = 0;
		for (const node of [stayed, fresh]) {
			Object.defineProperty(node, 'offsetWidth', {
				get() {
					reads += 1;
					return 0;
				}
			});
		}
		playFlip(list, new Map([['a', { left: 0, top: 0.2 }]]));
		expect(reads).toBe(0);
	});
});
