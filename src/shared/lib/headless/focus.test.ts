import { describe, expect, it, afterEach, vi } from 'vitest';
import { focusTrap, getFocusableElements } from './focus';

function mount(html: string): HTMLElement {
	const host = document.createElement('div');
	host.innerHTML = html;
	document.body.appendChild(host);
	return host;
}

describe('getFocusableElements', () => {
	let host: HTMLElement;
	afterEach(() => host?.remove());

	it('returns enabled, visible, focusable descendants in order', () => {
		host = mount(`
			<button id="a">a</button>
			<button id="b" disabled>b</button>
			<a id="c" href="#">c</a>
			<div id="d" tabindex="-1">d</div>
			<input id="e" />
		`);
		const ids = getFocusableElements(host).map((el) => el.id);
		expect(ids).toEqual(['a', 'c', 'e']);
	});
});

describe('focusTrap action', () => {
	let host: HTMLElement;
	afterEach(() => host?.remove());

	it('auto-focuses the first focusable element on activation', () => {
		host = mount(`<button id="first">first</button><button id="last">last</button>`);
		focusTrap(host, { enabled: true });
		expect(document.activeElement?.id).toBe('first');
	});

	it('cycles focus from last back to first on Tab', () => {
		host = mount(`<button id="first">first</button><button id="last">last</button>`);
		const action = focusTrap(host, { enabled: true });
		const last = host.querySelector<HTMLElement>('#last')!;
		last.focus();
		host.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
		expect(document.activeElement?.id).toBe('first');
		action?.destroy?.();
	});

	it('restores focus to the previously focused element on destroy', () => {
		const outside = document.createElement('button');
		outside.id = 'outside';
		document.body.appendChild(outside);
		outside.focus();

		host = mount(`<button id="inner">inner</button>`);
		const action = focusTrap(host, { enabled: true });
		expect(document.activeElement?.id).toBe('inner');
		action?.destroy?.();
		expect(document.activeElement?.id).toBe('outside');
		outside.remove();
	});

	it('does not trap when disabled', () => {
		host = mount(`<button id="first">first</button>`);
		const spy = vi.spyOn(host.querySelector<HTMLElement>('#first')!, 'focus');
		focusTrap(host, { enabled: false });
		expect(spy).not.toHaveBeenCalled();
	});
});
