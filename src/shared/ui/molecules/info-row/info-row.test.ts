import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import InfoRow from './info-row.svelte';
import type { InfoRowProps } from './index';

const glyphOf = (element: HTMLElement) =>
	element.querySelector<SVGElement>('[data-slot="ionicon"]');
/** The element whose whole text is `text` (the value sits in its own span, which `getByText` does not join). */
const byWholeText = (tag: string, text: string) =>
	screen.getByText((_, element) => element?.tagName === tag && element.textContent === text);

describe('InfoRow', () => {
	it('U-02.2 (K5.6, D4 α): circled — the glyph in a 40 tint circle, «title: value» and a muted description', () => {
		render(InfoRow, {
			props: {
				variant: 'circled',
				icon: 'time-outline',
				title: 'Χρόνος απάντησης',
				value: 'Σε 1 ώρα',
				description: 'Συνήθως απαντά την ίδια μέρα',
				testId: 'row'
			}
		});
		const row = screen.getByTestId('row');
		expect(row).toHaveClass('flex', 'flex-row', 'items-start', 'gap-4');
		const circle = row.querySelector('[data-slot="info-row-circle"]');
		expect(circle).toHaveClass(
			'flex',
			'size-control-sm',
			'shrink-0',
			'items-center',
			'justify-center',
			'rounded-full',
			'bg-foreground/8'
		);
		expect(glyphOf(row)).toHaveClass('icon-md', 'text-foreground');
		const title = screen.getByText('Χρόνος απάντησης: Σε 1 ώρα');
		expect(title).toHaveClass('text-body-md', 'font-semibold', 'text-foreground');
		expect(title.querySelector('.text-primary-text')).toBeNull();
		expect(title.parentElement).toHaveClass('flex', 'flex-1', 'flex-col', 'gap-1');
		expect(screen.getByText('Συνήθως απαντά την ίδια μέρα')).toHaveClass(
			'text-body-sm',
			'text-muted-foreground'
		);
	});

	it('U-02.2 (D4 β, β′): plain 12 apart and plain-wide 16 — a bare glyph, the value in primary text', () => {
		const view = render(InfoRow, {
			props: {
				variant: 'plain',
				icon: 'briefcase-outline',
				title: 'Εμπειρία',
				value: '12 έτη',
				iconTone: 'primary',
				testId: 'row'
			}
		});
		const row = screen.getByTestId('row');
		expect(row).toHaveClass('flex', 'flex-row', 'items-start', 'gap-3');
		expect(row.querySelector('[data-slot="info-row-circle"]')).toBeNull();
		expect(glyphOf(row)).toHaveClass('icon-md', 'text-primary');
		expect(byWholeText('P', 'Εμπειρία: 12 έτη')).toHaveClass('font-semibold', 'text-foreground');
		expect(screen.getByText('12 έτη')).toHaveClass('text-primary-text');
		view.unmount();
		render(InfoRow, {
			props: {
				variant: 'plain-wide',
				icon: 'card-outline',
				title: 'Πληρωμή με κάρτα',
				testId: 'row'
			}
		});
		expect(screen.getByTestId('row')).toHaveClass('gap-4');
		expect(screen.getByTestId('row')).not.toHaveClass('gap-3');
		expect(screen.getByText('Πληρωμή με κάρτα').textContent).toBe('Πληρωμή με κάρτα');
		expect(screen.queryByText(/:/)).toBeNull();
	});

	it('U-02.2 (D4 γ): inline — «title value» in one line, the value semibold with its own id', () => {
		render(InfoRow, {
			props: {
				variant: 'inline',
				icon: 'car-outline',
				title: 'Στάθμευση',
				value: 'Δωρεάν',
				valueTestId: 'parking',
				testId: 'row'
			}
		});
		const row = screen.getByTestId('row');
		expect(row.tagName).toBe('DIV');
		expect(row).toHaveClass('flex', 'flex-row', 'items-start', 'gap-3');
		expect(byWholeText('SPAN', 'Στάθμευση Δωρεάν')).toHaveClass(
			'flex-1',
			'text-body-md',
			'text-foreground'
		);
		expect(screen.getByTestId('parking')).toHaveClass('font-semibold');
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('U-03.1 (D4 γ′, a11y): an acting inline row is one 48 target named «title value», a press or a `tel:` link', async () => {
		const user = userEvent.setup({ delay: null });
		const onclick = vi.fn();
		const view = render(InfoRow, {
			props: {
				variant: 'inline',
				icon: 'call-outline',
				title: 'Τηλέφωνο',
				value: '210 1234567',
				onclick
			}
		});
		const button = screen.getByRole('button', { name: 'Τηλέφωνο 210 1234567' });
		expect(button).toHaveClass('flex', 'min-h-touch', 'w-full', 'flex-row', 'items-start', 'gap-3');
		await user.click(button);
		expect(onclick).toHaveBeenCalledOnce();
		view.unmount();
		render(InfoRow, {
			props: {
				variant: 'inline',
				icon: 'call-outline',
				title: 'Τηλέφωνο',
				value: '210 1234567',
				href: 'tel:+302101234567',
				'aria-label': 'Κλήση στο 210 1234567'
			}
		});
		expect(screen.getByRole('link', { name: 'Κλήση στο 210 1234567' })).toHaveAttribute(
			'href',
			'tel:+302101234567'
		);
	});

	it('U-03.1 (negative): only the inline row acts — a press on another variant does not type-check', () => {
		const rows: InfoRowProps[] = [
			{ variant: 'inline', icon: 'call-outline', title: 'α', onclick: () => {} },
			// @ts-expect-error a circled row never acts
			{ variant: 'circled', icon: 'time-outline', title: 'α', onclick: () => {} },
			// @ts-expect-error a plain row is never a link
			{ variant: 'plain', icon: 'time-outline', title: 'α', href: 'tel:1' }
		];
		expect(rows).toHaveLength(3);
	});

	it('U-03.1 (zones, light/dark): the same row at every width and only theme tokens', () => {
		const { container } = render(InfoRow, {
			props: { variant: 'circled', icon: 'time-outline', title: 'α', value: 'β' }
		});
		expect(container.innerHTML).not.toMatch(/\b(tablet|split|laptop|desktop|wide):/);
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});
});
