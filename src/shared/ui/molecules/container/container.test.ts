import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Harness from './container.harness.svelte';
import { containerWidthClassesOf } from './index';

const ZONE_GUTTERS = ['px-gutter-sm', 'split:px-gutter-md', 'desktop:px-gutter-lg'];

describe('Container', () => {
	it('U-03.1 (K2.1): defaults to the page column, centred with the zone gutters 24 / 32 from 950 / 48 from 1440', () => {
		render(Harness);
		const column = screen.getByTestId('column');
		expect(column.tagName).toBe('DIV');
		expect(column).toHaveClass('mx-auto', 'w-full', 'max-w-page', ...ZONE_GUTTERS);
		expect(column).toHaveTextContent('Περιεχόμενο');
	});

	it('U-04.1: the page column widens to 1920 from 1920 (Airbnb’s 4K zone), keeping the desktop gutter', () => {
		render(Harness);
		const column = screen.getByTestId('column');
		expect(column).toHaveClass('max-w-page', 'wide:max-w-wide', 'desktop:px-gutter-lg');
		expect(column.className).not.toMatch(/wide:px-/);
		expect(containerWidthClassesOf('content', { desktop: 'page' })).toBe(
			'max-w-content desktop:max-w-page wide:max-w-wide'
		);
		expect(containerWidthClassesOf('listing')).toBe('max-w-listing');
		expect(containerWidthClassesOf('page', { wide: 'page' })).toBe('max-w-page wide:max-w-page');
		expect(containerWidthClassesOf('page', { laptop: 'listing' })).toBe(
			'max-w-page laptop:max-w-listing'
		);
	});

	it('U-03.1 (K2.1): caps the column at each shared container width', () => {
		for (const width of [
			'narrow',
			'text',
			'form',
			'dialog',
			'content',
			'listing',
			'page',
			'wide'
		] as const) {
			const view = render(Harness, { props: { width } });
			const column = screen.getByTestId('column');
			expect(column).toHaveClass(`max-w-${width}`);
			expect(column.className.match(/(^|\s)max-w-/g)).toHaveLength(1);
			view.unmount();
		}
	});

	it('U-03.1 (K2.1): widens from a zone up with widthByZone, in classes the server already renders', () => {
		render(Harness, {
			props: { width: 'content', widthByZone: { tablet: 'listing', desktop: 'page' } }
		});
		const column = screen.getByTestId('column');
		expect(column).toHaveClass('max-w-content', 'tablet:max-w-listing', 'desktop:max-w-page');
		expect(column).not.toHaveClass('split:max-w-listing', 'laptop:max-w-listing');
		expect(containerWidthClassesOf('content', { phone: 'form', laptop: 'listing' })).toBe(
			'max-w-form laptop:max-w-listing'
		);
	});

	it('U-03.1 (K2.1): gutter none leaves the padding to the caller, and the tag is the caller’s', () => {
		render(Harness, { props: { gutter: 'none', as: 'main' } });
		const column = screen.getByTestId('column');
		expect(column.tagName).toBe('MAIN');
		for (const gutter of ZONE_GUTTERS) expect(column).not.toHaveClass(gutter);
		expect(column.className).not.toMatch(/\[/);
	});

	it('U-09.15 (5α): `full` caps nothing — a phone column the screen wide, then `content` from the tablet', () => {
		expect(containerWidthClassesOf('full', { tablet: 'content' })).toBe(
			'max-w-none tablet:max-w-content'
		);
		expect(containerWidthClassesOf('full')).toBe('max-w-none');
	});
});
