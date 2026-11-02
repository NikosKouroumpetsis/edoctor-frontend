import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import LinkDirectory from './link-directory.svelte';
import type { LinkDirectoryTab } from './index';

const links = (prefix: string, count: number) =>
	Array.from({ length: count }, (_, index) => ({
		label: `${prefix} ${index + 1}`,
		description: 'Αθήνα',
		href: `/doctors?what=${prefix}-${index + 1}`
	}));

const tabs: LinkDirectoryTab[] = [
	{ id: 'specialties', label: 'Ειδικότητες', links: links('Καρδιολόγος', 14) },
	{ id: 'areas', label: 'Περιοχές', links: links('Περιοχή', 3) },
	{ id: 'online', label: 'Online', links: links('Βιντεοκλήση', 2) }
];

/**
 * 🔴 fin1: what keeps «more» (or its words) from staying in its grid cell — a no-wrap, a fixed width, and, on the
 * button, a missing cap at the cell's width (`max-w-full`). The label checks without the cap (`min-w-0` holds it).
 */
function cellOverflowRisks(classes: string): string[] {
	const names = classes.split(/\s+/).filter(Boolean);
	const risks = names.filter(
		(name) =>
			/^(whitespace-nowrap|whitespace-pre|text-nowrap|shrink-0)$/.test(name) ||
			/^w-(?!full$)/.test(name)
	);
	const isButton = names.includes('inline-flex');
	return isButton && !names.includes('max-w-full') ? [...risks, 'no max-w-full'] : risks;
}

function renderDirectory(props: Partial<{ initialCount: number; moreLabel: string }> = {}) {
	return render(LinkDirectory, {
		props: { title: 'Δημοφιλείς αναζητήσεις', tabs, testId: 'popular', ...props }
	});
}

describe('LinkDirectory', () => {
	it('U-16.9: Airbnb’s popular searches — the 22/600 heading, tabs underlined (2) when chosen, the grid 2 · 4 · 6', () => {
		renderDirectory();
		const heading = screen.getByRole('heading', { level: 2, name: 'Δημοφιλείς αναζητήσεις' });
		expect(heading).toHaveClass('text-heading-sm', 'font-semibold');
		const tablist = screen.getByRole('tablist', { name: 'Δημοφιλείς αναζητήσεις' });
		const [first, second] = within(tablist).getAllByRole('tab');
		expect(first).toHaveAttribute('aria-selected', 'true');
		expect(first).toHaveClass('border-b-2', 'aria-selected:border-foreground', 'min-h-touch');
		expect(second).toHaveAttribute('aria-selected', 'false');
		expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', first.id);
		const grid = document.querySelector('[data-slot="link-directory-grid"]');
		expect(grid).toHaveClass('grid-cols-2', 'tablet:grid-cols-4', 'laptop:grid-cols-6');
		expect(screen.getAllByRole('link')).toHaveLength(14);
		expect(screen.getByRole('link', { name: 'Καρδιολόγος 1 Αθήνα' })).toHaveAttribute(
			'href',
			'/doctors?what=Καρδιολόγος-1'
		);
	});

	it('U-16.9: a tab shows its own links; the arrows move between tabs and choose them', async () => {
		const user = userEvent.setup({ delay: null });
		renderDirectory();
		await user.click(screen.getByTestId('popular-tab-areas'));
		expect(screen.getByTestId('popular-tab-areas')).toHaveAttribute('aria-selected', 'true');
		expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
			'/doctors?what=Περιοχή-1',
			'/doctors?what=Περιοχή-2',
			'/doctors?what=Περιοχή-3'
		]);
		await user.keyboard('{ArrowRight}');
		expect(screen.getByTestId('popular-tab-online')).toHaveFocus();
		expect(screen.getByTestId('popular-tab-online')).toHaveAttribute('aria-selected', 'true');
		expect(screen.getAllByRole('link')).toHaveLength(2);
	});

	it('U-16.9: «Εμφάνιση περισσότερων» shows the rest of the tab and moves the focus to the first new link', async () => {
		const user = userEvent.setup({ delay: null });
		renderDirectory({ initialCount: 11, moreLabel: 'Εμφάνιση περισσότερων' });
		expect(screen.getAllByRole('link')).toHaveLength(11);
		const more = screen.getByTestId('popular-more');
		expect(more).toHaveTextContent('Εμφάνιση περισσότερων');
		expect(more.querySelector('[data-icon="chevron-down"]')).not.toBeNull();
		await user.click(more);
		expect(screen.getAllByRole('link')).toHaveLength(14);
		expect(screen.getByRole('link', { name: 'Καρδιολόγος 12 Αθήνα' })).toHaveFocus();
		expect(screen.queryByTestId('popular-more')).not.toBeInTheDocument();
		await user.click(screen.getByTestId('popular-tab-areas'));
		expect(screen.queryByTestId('popular-more')).not.toBeInTheDocument();
	});

	// Live r1 (5): r0 drew «more» on its own line under the grid; Airbnb's (and the prototype's) is its last cell.
	it('U-16.9: «Εμφάνιση περισσότερων» is the grid’s last cell, in the place of the next link', () => {
		renderDirectory({ initialCount: 11, moreLabel: 'Εμφάνιση περισσότερων' });
		const grid = document.querySelector('[data-slot="link-directory-grid"]') as HTMLElement;
		const cells = [...grid.children];
		expect(cells).toHaveLength(12);
		expect(cells.at(-1)).toHaveAttribute('data-slot', 'link-directory-more');
		expect(cells.at(-1)).toContainElement(screen.getByTestId('popular-more'));
		expect(screen.getByTestId('popular-panel').lastElementChild).toBe(grid);
	});

	// Rewritten by fin1 (the orchestrator's decision, 29/10; S-28.2: Airbnb's measured footer): D2's live finding 1 wanted
	// «more» on one line at every width, but its nowrap 190 overflowed the ~150 cell and the page (360–1128). Airbnb's is
	// as wide as its cell and wraps (`white-space: normal`, two lines of 18).
	it('U-16.9: «more» stays in its cell — it wraps (no nowrap), at most the cell’s width, the chevron after the words, still a 48 target aligned left', () => {
		renderDirectory({ initialCount: 11, moreLabel: 'Εμφάνιση περισσότερων' });
		const more = screen.getByTestId('popular-more');
		expect(cellOverflowRisks(more.className)).toEqual([]);
		expect(more).toHaveClass(
			'max-w-full',
			'min-h-touch',
			'min-w-touch',
			'self-start',
			'text-left',
			'inline-flex',
			'flex-row',
			'items-center'
		);
		const label = more.querySelector('[data-slot="link-directory-more-label"]') as HTMLElement;
		expect(label).toHaveTextContent('Εμφάνιση περισσότερων');
		expect(label).toHaveClass('min-w-0');
		expect(cellOverflowRisks(label.className)).toEqual([]);
		const chevron = more.querySelector('[data-icon="chevron-down"]') as Element;
		expect(chevron).toHaveClass('shrink-0');
		expect(label.nextElementSibling).toBe(chevron);
		const cell = more.closest('[data-slot="link-directory-more"]');
		expect(cell).toHaveClass('min-w-0');
		expect(cell).not.toHaveClass('overflow-hidden');
	});

	it('U-16.9 (negative, fin1): the r0 «more» (nowrap, no cap) is reported — it would run out of its cell and the page', () => {
		const r0 =
			'inline-flex min-h-touch min-w-touch flex-row items-center gap-1 self-start rounded-sm text-body-sm font-semibold whitespace-nowrap text-foreground outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50';
		expect(cellOverflowRisks(r0)).toEqual(['whitespace-nowrap', 'no max-w-full']);
		expect(cellOverflowRisks('min-w-0 text-nowrap')).toEqual(['text-nowrap']);
		expect(cellOverflowRisks('max-w-full w-tile')).toEqual(['w-tile']);
	});

	it('U-16.9 (negative): without its words «more» never shows, every link does', () => {
		renderDirectory({ initialCount: 11 });
		expect(screen.getAllByRole('link')).toHaveLength(14);
		expect(screen.queryByTestId('popular-more')).not.toBeInTheDocument();
	});
});
