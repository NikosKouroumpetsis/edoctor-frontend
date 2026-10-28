import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Ionicon from './ionicon.svelte';
import { ioniconNames } from './index';
import { ionicons } from './glyphs';

describe('Ionicon', () => {
	it('U-03.3: carries the kit’s glyphs by the application’s names, each an outline on the 512 artboard', () => {
		expect(ioniconNames.length).toBeGreaterThan(60);
		for (const name of [
			'heart',
			'heart-outline',
			'close',
			'chevron-back',
			'alert-circle',
			'star'
		] as const)
			expect(ioniconNames).toContain(name);
		for (const name of ioniconNames)
			expect(ionicons[name], name).toMatch(/^M[\d -]+(?:[LQZM][\d -]*)+Z$/);
	});

	it('U-03.3: is decorative by default, sized and coloured by its classes', () => {
		const { container } = render(Ionicon, {
			props: { name: 'heart-outline', class: 'icon-lg text-accent' }
		});
		const svg = container.querySelector('svg') as SVGElement;
		expect(svg).toHaveAttribute('viewBox', '0 0 512 512');
		expect(svg).toHaveAttribute('aria-hidden', 'true');
		expect(svg).toHaveAttribute('fill', 'currentColor');
		expect(svg).toHaveAttribute('data-icon', 'heart-outline');
		expect(svg).toHaveClass('icon-lg', 'text-accent');
		expect(svg).not.toHaveClass('icon-md');
		expect(svg.querySelector('path')).toHaveAttribute('d', ionicons['heart-outline']);
	});

	it('U-03.3: a label makes it a named image', () => {
		render(Ionicon, { props: { name: 'star', label: 'Βαθμολογία' } });
		expect(screen.getByRole('img', { name: 'Βαθμολογία' })).toBeInTheDocument();
	});
});
