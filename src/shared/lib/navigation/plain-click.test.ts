import { describe, expect, it } from 'vitest';
import { isPlainClick } from './plain-click';

const press = (init: MouseEventInit = {}, handled = false) => {
	const event = new MouseEvent('click', { button: 0, cancelable: true, ...init });
	if (handled) event.preventDefault();
	return event;
};

describe('shared/lib/navigation · isPlainClick', () => {
	it('the main button with no modifier is the page’s to take over', () => {
		expect(isPlainClick(press())).toBe(true);
	});

	it('(negative) a new tab or window keeps the link’s own way: a modifier, another button, a press already handled', () => {
		for (const init of [
			{ metaKey: true },
			{ ctrlKey: true },
			{ shiftKey: true },
			{ altKey: true },
			{ button: 1 }
		]) {
			expect(isPlainClick(press(init)), JSON.stringify(init)).toBe(false);
		}
		expect(isPlainClick(press({}, true))).toBe(false);
	});
});
