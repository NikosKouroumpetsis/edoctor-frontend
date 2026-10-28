import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Harness from './overlap-sheet.harness.svelte';

const FLAT = [
	'tablet:mt-0',
	'tablet:rounded-none',
	'tablet:border-0',
	'tablet:bg-transparent',
	'tablet:px-0',
	'tablet:pt-0'
];

describe('OverlapSheet', () => {
	it('U-02.2 (K5.5): rises hero-overlap over the photo — hairline frame open below, xl top corners, 20 in, blocks a section apart (M-21)', () => {
		render(Harness);
		const sheet = screen.getByTestId('sheet');
		expect(sheet).toHaveClass(
			'relative',
			'-mt-hero-overlap',
			'flex',
			'flex-col',
			'gap-section',
			'rounded-t-xl',
			'border-x',
			'border-t',
			'border-border/60',
			'bg-card',
			'px-5',
			'pt-5',
			'pb-section'
		);
		expect(sheet).not.toHaveClass('border-b');
		expect(screen.getByRole('heading', { level: 1 })).toBe(sheet.firstElementChild);
	});

	it('U-05.7 (zones): from 744 a plain column under the PhotoGrid — nothing rises, no frame — unless the caller keeps it', () => {
		const view = render(Harness);
		expect(screen.getByTestId('sheet')).toHaveClass(...FLAT, 'gap-section', 'pb-section');
		view.unmount();
		render(Harness, { props: { flatFrom: 'none' } });
		expect(screen.getByTestId('sheet').className).not.toMatch(/\btablet:/);
	});

	it('U-03.1 (light/dark): only theme tokens', () => {
		const { container } = render(Harness);
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});
});
