import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRawSnippet } from 'svelte';
import { render, screen } from '@testing-library/svelte';
import { ListHeader } from './index';

const chips = createRawSnippet(() => ({
	render: () =>
		'<span><a href="/a" data-state="off">Α</a><a href="/b" data-state="on" aria-current="page">Β</a></span>'
}));

afterEach(() => vi.restoreAllMocks());

describe('ListHeader (MINOR-5 of r1)', () => {
	it('U-57.2 / U-58.1: the page’s ONE h1 (hidden below 744 where the bar names the page) and the chips as a named landmark', () => {
		render(ListHeader, {
			props: { title: 'Άρθρα υγείας', titleClass: 'max-tablet:sr-only', chips, chipsLabel: 'Είδος' }
		});
		expect(screen.getByRole('heading', { level: 1, name: 'Άρθρα υγείας' })).toHaveClass(
			'max-tablet:sr-only',
			'tablet:text-display-md'
		);
		const row = screen.getByRole('navigation', { name: 'Είδος' });
		expect(row).toHaveClass(
			'justify-start',
			'overflow-x-auto',
			'tablet:flex-wrap',
			'tablet:justify-center-safe'
		);
	});

	it('U-58.1 (the prototype 08 Π1): the chosen chip comes into the row’s view by itself', () => {
		const scrollBy = vi.fn();
		Object.defineProperty(HTMLElement.prototype, 'scrollBy', {
			value: scrollBy,
			configurable: true
		});
		vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
			this: HTMLElement
		) {
			const box =
				this.getAttribute('data-state') === 'on'
					? { left: 400, right: 460 }
					: { left: 0, right: 360 };
			return {
				...box,
				top: 0,
				bottom: 48,
				width: box.right - box.left,
				height: 48,
				x: box.left,
				y: 0,
				toJSON: () => box
			} as DOMRect;
		});
		render(ListHeader, {
			props: { title: 'Κέντρο βοήθειας', chips, chipsLabel: 'Θέματα', chosen: 'b' }
		});
		expect(scrollBy).toHaveBeenCalledWith({ left: 100, behavior: 'instant' });
		delete (HTMLElement.prototype as { scrollBy?: unknown }).scrollBy;
	});

	it('U-58.1 (negative): without chips there is no empty landmark', () => {
		render(ListHeader, { props: { title: 'Κέντρο βοήθειας', chipsLabel: 'Θέματα' } });
		expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
	});
});
