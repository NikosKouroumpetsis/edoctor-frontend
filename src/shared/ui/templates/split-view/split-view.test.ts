import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { platform } from '$shared/design/tokens';
import { projectRoot } from '../../../../../tests/architecture/source-scan';
import Harness from './split-view.harness.svelte';

const list = () => document.querySelector('[data-slot="split-view-list"]') as HTMLElement;
const pane = () => document.querySelector('[data-slot="split-view-pane"]') as HTMLElement;
const SOLO = ['split:mx-auto', 'split:w-full', 'split:max-w-split-solo'];
const SPLIT_LIST = [
	'split:overflow-y-auto',
	'split:overscroll-contain',
	'split:border-r',
	'split:border-border/60'
];
const SPLIT_PANE = ['split:min-h-0', 'split:overflow-y-auto', 'split:overscroll-contain'];
const centre = () =>
	document.querySelector('[data-slot="split-view-centre"]') as HTMLElement | null;
const MENU_INSET = [
	'split:px-6',
	'split:pt-section',
	'split:pb-section-lg',
	'laptop:px-pane-inset',
	'laptop:pt-reading-gap'
];
const CENTRED_INSET = [
	'split:px-pane-inset',
	'split:pt-section',
	'split:pb-pane-inset-lg',
	'laptop:pt-reading-gap'
];
const CENTRE = ['split:mx-auto', 'split:w-full', 'split:max-w-split-solo'];
/** None of `classes` (jest-dom's negated `toHaveClass` passes when only ONE of several is missing). */
const lacks = (node: Element, ...classes: string[]) => {
	for (const name of classes) expect(node, name).not.toHaveClass(name);
};

describe('SplitView', () => {
	it('U-134.2: below 950 the list alone (the right column in the page, hidden); from 950 the list of 420 / 460 and the right column, each scrolling on its own under the bar', () => {
		render(Harness);
		const root = screen.getByTestId('split');
		expect(root).toHaveAttribute('data-widths', 'wide');
		expect(root).toHaveClass('split:grid', 'split:h-split', 'split:grid-split');
		expect(root).not.toHaveClass('split:grid-inbox');
		expect(list()).toHaveClass('min-w-0', ...SPLIT_LIST);
		expect(list()).not.toHaveClass('hidden');
		expect(pane()).toHaveClass('min-w-0', 'hidden', 'split:block', ...SPLIT_PANE);
		expect(screen.getByRole('heading', { level: 1, name: 'Λίστα' })).toBeInTheDocument();
		expect(pane()).toHaveTextContent('Λεπτομέρεια');
		expect(root.firstElementChild).toBe(list());
		expect(root.lastElementChild).toBe(pane());
		expect(root.className + list().className + pane().className).not.toMatch(/\[/u);
	});

	it('U-136.2: `open` below 950 shows what the list opened instead of the list, which stays in the page; from 950 both', () => {
		render(Harness, { props: { open: true } });
		expect(screen.getByTestId('split')).toHaveAttribute('data-open');
		expect(list()).toHaveClass('hidden', 'split:block', ...SPLIT_LIST);
		expect(pane()).toHaveClass(...SPLIT_PANE);
		expect(pane()).not.toHaveClass('hidden');
		expect(list()).toHaveTextContent('Γραμμή πρώτη');
	});

	it('D-W4-52: `widths="inbox"` is the inbox’s list of 380 / 400, the same height and columns', () => {
		render(Harness, { props: { widths: 'inbox' } });
		const root = screen.getByTestId('split');
		expect(root).toHaveClass('split:grid', 'split:h-split', 'split:grid-inbox');
		expect(root).not.toHaveClass('split:grid-split');
		expect(list()).toHaveClass(...SPLIT_LIST);
		expect(pane()).toHaveClass(...SPLIT_PANE);
	});

	it('D-W45-08: `widths="menu"` is a menu of 340 / 420 with its own inset from 950 (32 · 24 · 48; 40 · 48 from 1128), the same height and columns', () => {
		render(Harness, { props: { widths: 'menu' } });
		const root = screen.getByTestId('split');
		expect(root).toHaveAttribute('data-widths', 'menu');
		expect(root).toHaveClass('split:grid', 'split:h-split', 'split:grid-menu');
		lacks(root, 'split:grid-split', 'split:grid-inbox');
		expect(list()).toHaveClass(...SPLIT_LIST, ...MENU_INSET);
		expect(pane()).toHaveClass(...SPLIT_PANE);
		// The menu's inset is the menu's alone: without `centred` the right column takes none, and no box of its own.
		lacks(pane(), ...CENTRED_INSET);
		expect(centre()).toBeNull();
		expect(root.className + list().className + pane().className).not.toMatch(/\[/u);
	});

	it('🔴 U-167: το περιεχόμενο της δεξιάς στήλης είναι στο κέντρο της — `centred` puts it in a box of at most 640 in the MIDDLE of the right column, inside the column’s inset (32 / 40 over, 48 a side, 64 under), never against the line', () => {
		render(Harness, { props: { widths: 'menu', centred: true } });
		expect(screen.getByTestId('split')).toHaveAttribute('data-centred');
		expect(pane()).toHaveClass(...SPLIT_PANE, ...CENTRED_INSET);
		const box = centre();
		expect(box).not.toBeNull();
		expect(box?.parentElement).toBe(pane());
		expect(box).toHaveClass(...CENTRE);
		// What the list opened is inside the centred box, and nowhere else in the column.
		expect(box).toHaveTextContent('Λεπτομέρεια');
		expect(pane().children).toHaveLength(1);
		// The line stays the list's; the right column draws none of its own to lean on.
		expect(list()).toHaveClass('split:border-r');
		lacks(pane(), 'split:border-l', 'split:mx-auto');
		expect(pane().className + (box?.className ?? '')).not.toMatch(/\[/u);
	});

	it('🔴 U-167 (negative) · D-W45-08: without `centred` nothing changes for today’s readers (messages, appointments, relatives) — no box, no inset, at either of their widths', () => {
		for (const widths of ['wide', 'inbox'] as const) {
			const view = render(Harness, { props: { widths } });
			expect(screen.getByTestId('split')).not.toHaveAttribute('data-centred');
			expect(centre()).toBeNull();
			lacks(pane(), ...CENTRED_INSET, ...CENTRE);
			lacks(list(), ...MENU_INSET);
			expect(pane().firstElementChild?.tagName).toBe('H2');
			view.unmount();
		}
	});

	it('U-167 · U-139.1: `centred` with `solo` is the one column of 640 in the middle — no second inset, and what it holds stays the same element', async () => {
		const view = render(Harness, { props: { centred: true, solo: true, open: true } });
		const before = centre();
		expect(pane()).toHaveClass(...SOLO);
		lacks(pane(), ...CENTRED_INSET);
		lacks(before as HTMLElement, ...CENTRE);
		await view.rerender({ centred: true, solo: false, open: true });
		expect(centre()).toBe(before);
		expect(centre()).toHaveClass(...CENTRE);
		expect(pane()).toHaveClass(...CENTRED_INSET);
	});

	it('U-139.1: nothing for the right column ⇒ from 950 ONE column of 640 in the middle — the list, never beside an empty side', () => {
		render(Harness, { props: { solo: true } });
		const root = screen.getByTestId('split');
		expect(root).toHaveAttribute('data-solo');
		lacks(root, 'split:grid', 'split:h-split', 'split:grid-split');
		expect(list()).toHaveClass('min-w-0', ...SOLO);
		lacks(list(), 'hidden', 'split:border-r', 'split:overflow-y-auto');
		// The right column stays hidden at every width: no `split:block` brings it back from 950.
		expect(pane()).toHaveClass('hidden');
		lacks(pane(), 'split:block', ...SOLO);
	});

	it('🔴 D-W4-66 (live check w4-live-web Δ5): from 950 the one column is the page’s height under the bar, so the page’s white reaches the bottom; two columns keep their own height', () => {
		const solo = render(Harness, { props: { solo: true } });
		expect(screen.getByTestId('split')).toHaveClass('split:min-h-page');
		solo.unmount();
		const open = render(Harness, { props: { solo: true, open: true } });
		expect(screen.getByTestId('split')).toHaveClass('split:min-h-page');
		open.unmount();
		render(Harness);
		lacks(screen.getByTestId('split'), 'split:min-h-page');
		expect(screen.getByTestId('split')).toHaveClass('split:h-split');
	});

	it('U-139.1: `solo` with `open` (a first form, nothing to list) centres the right column and hides the list at every width', () => {
		render(Harness, { props: { solo: true, open: true } });
		expect(pane()).toHaveClass('min-w-0', ...SOLO);
		lacks(pane(), 'hidden', 'split:overflow-y-auto');
		expect(list()).toHaveClass('hidden');
		lacks(list(), 'split:block', ...SOLO);
	});

	it('U-139.1: the list is the same element with or without `solo`, so a list that loads keeps its place and its scroll', async () => {
		const view = render(Harness, { props: { solo: true } });
		const before = list();
		await view.rerender({ solo: false });
		expect(list()).toBe(before);
		expect(list()).toHaveClass(...SPLIT_LIST);
		expect(screen.getByTestId('split')).toHaveClass('split:grid');
	});

	it('names its columns as regions only when the caller gives their names', () => {
		const view = render(Harness, {
			props: { listLabel: 'Τα ραντεβού μου', paneLabel: 'Το ραντεβού' }
		});
		expect(screen.getByRole('region', { name: 'Τα ραντεβού μου' })).toBe(list());
		expect(screen.getByRole('region', { name: 'Το ραντεβού' })).toBe(pane());
		view.unmount();
		render(Harness);
		expect(screen.queryAllByRole('region')).toEqual([]);
		expect(list()).not.toHaveAttribute('aria-label');
		expect(pane()).not.toHaveAttribute('aria-label');
	});

	it('gives the caller the right column’s scrolling box', () => {
		let box: HTMLDivElement | null = null;
		render(Harness, { props: { onPane: (node) => (box = node) } });
		expect(box).toBe(pane());
	});

	it('U-134.2, U-139.1: the widths are the prototype’s — 420 / 460 from 1128, the solo 640 — and the utilities read them', () => {
		expect(platform.spacing['split-list-w']).toBe(420);
		expect(platform.spacing['split-list-w-lg']).toBe(460);
		expect(platform.spacing['split-solo']).toBe(640);
		const css = readFileSync(join(projectRoot, 'src/routes/layout.css'), 'utf8');
		const utility = (name: string) =>
			new RegExp(`@utility ${name} \\{([\\s\\S]*?)\\n\\}`, 'u').exec(css)?.[1] ?? '';
		expect(utility('grid-split')).toContain('var(--spacing-split-list-w) minmax(0, 1fr)');
		expect(utility('grid-split')).toMatch(
			/--breakpoint-laptop[\s\S]*var\(--spacing-split-list-w-lg\) minmax\(0, 1fr\)/u
		);
		expect(utility('h-split')).toContain('calc(100dvh - var(--spacing-bar-top))');
	});

	it('D-W45-08 · U-167: the menu’s widths are the prototype’s — 340, 420 from 1128 — beside the others, and `grid-menu` reads them', () => {
		expect(platform.spacing['split-menu-w']).toBe(340);
		expect(platform.spacing['split-menu-w-lg']).toBe(420);
		// The centred box is the solo column's 640, and the insets are names of the scale (48, 64, 32, 40).
		expect(platform.spacing['split-solo']).toBe(640);
		expect(platform.spacing['pane-inset']).toBe(48);
		expect(platform.spacing['pane-inset-lg']).toBe(64);
		expect(platform.spacing['reading-gap']).toBe(40);
		const css = readFileSync(join(projectRoot, 'src/routes/layout.css'), 'utf8');
		const utility = (name: string) =>
			new RegExp(`@utility ${name} \\{([\\s\\S]*?)\\n\\}`, 'u').exec(css)?.[1] ?? '';
		expect(utility('grid-menu')).toContain('var(--spacing-split-menu-w) minmax(0, 1fr)');
		expect(utility('grid-menu')).toMatch(
			/--breakpoint-laptop[\s\S]*var\(--spacing-split-menu-w-lg\) minmax\(0, 1fr\)/u
		);
		// The other widths' utilities are as they were.
		expect(utility('grid-split')).toContain('var(--spacing-split-list-w) minmax(0, 1fr)');
		expect(utility('grid-inbox')).toContain('var(--spacing-inbox-list-w) minmax(0, 1fr)');
	});
});
