import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Harness from './two-column-detail.harness.svelte';

const main = () => document.querySelector('[data-slot="two-column-detail-main"]');
const aside = () => document.querySelector('[data-slot="two-column-detail-aside"]');

describe('TwoColumnDetail', () => {
	it('S-28.2: one column below 950, a 12-column grid from 950 — main 7, one column of air, a sticky aside 4', () => {
		render(Harness);
		const root = screen.getByTestId('detail');
		expect(root).toHaveClass(
			'flex',
			'flex-col',
			'gap-section',
			'split:grid',
			'split:grid-cols-12',
			'split:gap-x-0'
		);
		expect(main()).toHaveClass('min-w-0', 'split:col-span-7', 'split:col-start-1');
		expect(aside()).toHaveClass(
			'split:col-span-4',
			'split:col-start-9',
			'split:sticky',
			'split:top-bar-top',
			'split:self-start'
		);
		expect(root.firstElementChild).toBe(main());
		expect(root.className + main()?.className + aside()?.className).not.toMatch(/\[/);
	});

	it('S-28.2: a start aside comes first in the source (first on the phone) and takes columns 1–4', () => {
		render(Harness, { props: { asidePosition: 'start', stickyAside: false } });
		const root = screen.getByTestId('detail');
		expect(root.firstElementChild).toBe(aside());
		expect(aside()).toHaveClass('split:col-span-4', 'split:col-start-1');
		expect(aside()).not.toHaveClass('split:sticky');
		expect(main()).toHaveClass('split:col-span-7', 'split:col-start-6');
		expect(root).toHaveTextContent(/Πλευρική.*Κύρια/);
	});

	it('U-41.1 / wave 1.5 (the profile, Airbnb at 744): `from="tablet"` is two columns from 744 — 7 + 1 + 4, the aside sticky there; the default stays 950', () => {
		render(Harness, { props: { from: 'tablet' } });
		const root = screen.getByTestId('detail');
		expect(root).toHaveAttribute('data-from', 'tablet');
		expect(root).toHaveClass('tablet:grid', 'tablet:grid-cols-12', 'tablet:gap-x-0');
		expect(root.className).not.toMatch(/split:/u);
		expect(main()).toHaveClass('tablet:col-span-7', 'tablet:col-start-1');
		expect(aside()).toHaveClass(
			'tablet:col-span-4',
			'tablet:col-start-9',
			'tablet:sticky',
			'tablet:self-start'
		);
	});
});
