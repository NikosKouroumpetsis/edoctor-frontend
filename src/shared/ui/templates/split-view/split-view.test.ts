import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRawSnippet, tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { containers, motion, platform } from '$shared/design/tokens';
import { tokensToCss } from '$shared/design/tokens/to-css';
import { projectRoot } from '../../../../../tests/architecture/source-scan';
import Harness from './split-view.harness.svelte';
import SplitView from './split-view.svelte';

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
// 🔴 U-215.3 (D-W52-13): from 1128 the menu of 324 in the MIDDLE of its column (`px-menu-centred`); 950–1127 as it was.
const MENU_INSET = [
	'split:px-6',
	'split:pt-section',
	'split:pb-section-lg',
	'laptop:px-menu-centred',
	'laptop:pt-reading-gap'
];
const FRAME = ['split:mx-auto', 'split:w-full', 'split:max-w-wide'];
const LAPTOP_FRAME = ['laptop:mx-auto', 'laptop:w-full', 'laptop:max-w-wide'];
const menu = () => document.querySelector('[data-slot="split-view-menu"]') as HTMLElement | null;
const menuBox = () =>
	document.querySelector('[data-slot="split-view-menu-box"]') as HTMLElement | null;
const rail = () => document.querySelector('[data-slot="split-view-rail"]') as HTMLElement | null;
const foldButton = () => screen.getByRole('button', { name: 'Σύμπτυξη του μενού' });
const unfoldButton = () => screen.getByRole('button', { name: 'Άνοιγμα του μενού' });
// jsdom has no `inert` IDL attribute: Svelte sets the property, as a browser reads it.
const inert = (node: Element | null) =>
	(node as (HTMLElement & { inert?: boolean }) | null)?.inert === true;
const layoutCss = () => readFileSync(join(projectRoot, 'src/routes/layout.css'), 'utf8');
/** The body of an `@utility` of `layout.css`, its white space folded. */
const utilityOf = (name: string) =>
	(new RegExp(`@utility ${name} \\{([\\s\\S]*?)\\n\\}`, 'u').exec(layoutCss())?.[1] ?? '').replace(
		/\s+/gu,
		' '
	);

/** A `ResizeObserver` the test fires by hand (jsdom draws no box). */
class ManualResizeObserver {
	static all: ManualResizeObserver[] = [];
	constructor(private readonly callback: () => void) {
		ManualResizeObserver.all.push(this);
	}
	observe() {}
	unobserve() {}
	disconnect() {}
	static fire() {
		for (const observer of ManualResizeObserver.all) observer.callback();
	}
}
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
	afterEach(() => {
		vi.unstubAllGlobals();
		ManualResizeObserver.all = [];
	});

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

	it('U-139.1: a `solo` list that opens nothing yet needs no right column — the list in the middle, the pane in the page, empty and hidden', () => {
		const list = createRawSnippet(() => ({ render: () => '<p data-testid="alone">list</p>' }));
		render(SplitView, { props: { list, widths: 'menu', centred: true, solo: true } });
		const root = document.querySelector('[data-slot="split-view"]') as HTMLElement;
		expect(root).toHaveAttribute('data-solo', 'true');
		expect(root.querySelector('[data-slot="split-view-list"]')).toContainElement(
			screen.getByTestId('alone')
		);
		expect(root.querySelector('[data-slot="split-view-list"]')).toHaveClass(...SOLO);
		const pane = root.querySelector('[data-slot="split-view-pane"]') as HTMLElement;
		expect(pane).toHaveClass('hidden');
		expect(pane.textContent?.trim()).toBe('');
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

	it('D-W45-08 · 🔴 U-215.3 (D-W52-13): `widths="menu"` is a menu of 340 (from 1128 30 % of the frame, 420 at least) with its own inset from 950 (32 · 24 · 48; from 1128 40 over and the menu of 324 in the middle of its column), the same height and columns', () => {
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

	it('D-W45-08 · U-167 · 🔴 U-215.3 (D-W52-13): the menu’s widths are the prototype’s — 340, and from 1128 `max(420, 30%)` with the menu of 324 in the middle of its column — beside the others, and `grid-menu` reads them', () => {
		expect(platform.spacing['split-menu-w']).toBe(340);
		expect(platform.spacing['split-menu-w-lg']).toBe(420);
		expect(platform.spacing['split-menu']).toBe(324);
		// The centred box is the solo column's 640, and the insets are names of the scale (48, 64, 32, 40).
		expect(platform.spacing['split-solo']).toBe(640);
		expect(platform.spacing['pane-inset']).toBe(48);
		expect(platform.spacing['pane-inset-lg']).toBe(64);
		expect(platform.spacing['reading-gap']).toBe(40);
		const css = readFileSync(join(projectRoot, 'src/routes/layout.css'), 'utf8');
		const utility = (name: string) =>
			new RegExp(`@utility ${name} \\{([\\s\\S]*?)\\n\\}`, 'u').exec(css)?.[1] ?? '';
		expect(utility('grid-menu')).toContain('var(--spacing-split-menu-w) minmax(0, 1fr)');
		// The 420 stays the least; the 30 % of the frame is what U-215.3 adds.
		expect(utility('grid-menu')).toMatch(
			/--breakpoint-laptop[\s\S]*max\(var\(--spacing-split-menu-w-lg\), 30%\) minmax\(0, 1fr\)/u
		);
		expect(utilityOf('px-menu-centred')).toContain(
			'padding-inline: max(var(--spacing-pane-inset), calc((100% - var(--spacing-split-menu)) / 2));'
		);
		// The other widths' utilities are as they were.
		expect(utility('grid-split')).toContain('var(--spacing-split-list-w) minmax(0, 1fr)');
		expect(utility('grid-inbox')).toContain('var(--spacing-inbox-list-w) minmax(0, 1fr)');
	});

	it('D-W51-36: `from="laptop"` stands the columns side by side from 1128 — the list of 460, each column scrolling, the right one centred — and from 950 stays ONE column', () => {
		render(Harness, { props: { from: 'laptop', centred: true } });
		const root = screen.getByTestId('split');
		expect(root).toHaveAttribute('data-from', 'laptop');
		expect(root).toHaveClass('laptop:grid', 'laptop:h-split', 'laptop:grid-split');
		expect(list()).toHaveClass(
			'laptop:overflow-y-auto',
			'laptop:overscroll-contain',
			'laptop:border-r',
			'laptop:border-border/60'
		);
		expect(pane()).toHaveClass(
			'hidden',
			'laptop:block',
			'laptop:min-h-0',
			'laptop:overflow-y-auto',
			'laptop:px-pane-inset',
			'laptop:pt-reading-gap',
			'laptop:pb-pane-inset-lg'
		);
		expect(centre()).toHaveClass('laptop:mx-auto', 'laptop:w-full', 'laptop:max-w-split-solo');
		// Nothing of 950: from 950 to 1127 one column, the list or what it opened.
		const every =
			root.className + list().className + pane().className + (centre()?.className ?? '');
		expect(every).not.toMatch(/(^|\s)split:/u);
		expect(every).not.toMatch(/\[/u);
	});

	it('D-W51-36: `from="laptop"` with `open` shows only what the list opened below 1128, both from it; `solo` centres one column from 1128', () => {
		const view = render(Harness, { props: { from: 'laptop', open: true } });
		expect(list()).toHaveClass('hidden', 'laptop:block');
		expect(pane()).not.toHaveClass('hidden');
		view.unmount();
		render(Harness, { props: { from: 'laptop', solo: true } });
		const root = screen.getByTestId('split');
		expect(root).toHaveClass('laptop:min-h-page');
		lacks(root, 'laptop:grid', 'split:grid', 'split:min-h-page');
		expect(list()).toHaveClass('laptop:mx-auto', 'laptop:w-full', 'laptop:max-w-split-solo');
	});

	it('D-W51-36 (negative): without `from` nothing changes — the 950 of every list until 5.1, no class of 1128’s own', () => {
		render(Harness, { props: { centred: true } });
		const root = screen.getByTestId('split');
		expect(root).toHaveAttribute('data-from', 'split');
		expect(root).toHaveClass('split:grid', 'split:h-split', 'split:grid-split');
		expect(list()).toHaveClass(...SPLIT_LIST);
		expect(pane()).toHaveClass('split:block', ...SPLIT_PANE, ...CENTRED_INSET);
		expect(centre()).toHaveClass(...CENTRE);
		lacks(root, 'laptop:grid', 'laptop:h-split', 'laptop:grid-split');
		lacks(list(), 'laptop:block', 'laptop:overflow-y-auto', 'laptop:border-r');
		lacks(pane(), 'laptop:block', 'laptop:min-h-0', 'laptop:px-pane-inset');
	});

	it('🔴 U-215.3 / D-W52-11: το πλαίσιο — from its zone the whole stands in the page’s frame, the bar’s (as wide as the page, 1920 at most, centred beyond it), at every width of the list and with `solo`; nothing of it below the zone', () => {
		for (const widths of ['wide', 'inbox', 'menu'] as const) {
			const view = render(Harness, { props: { widths } });
			expect(screen.getByTestId('split'), widths).toHaveClass(...FRAME);
			lacks(screen.getByTestId('split'), 'mx-auto', 'w-full', 'max-w-wide', ...LAPTOP_FRAME);
			view.unmount();
		}
		for (const props of [
			{ solo: true },
			{ solo: true, open: true },
			{ solo: true, centred: true }
		]) {
			const view = render(Harness, { props });
			expect(screen.getByTestId('split')).toHaveClass('split:min-h-page', ...FRAME);
			view.unmount();
		}
		const laptop = render(Harness, { props: { from: 'laptop' } });
		expect(screen.getByTestId('split')).toHaveClass(...LAPTOP_FRAME);
		lacks(screen.getByTestId('split'), ...FRAME);
		laptop.unmount();
		render(Harness, { props: { from: 'laptop', solo: true } });
		expect(screen.getByTestId('split')).toHaveClass('laptop:min-h-page', ...LAPTOP_FRAME);
		lacks(screen.getByTestId('split'), ...FRAME);
		expect(containers.wide).toBe(1920);
	});

	it('🔴 D-W52-13: η στήλη του μενού — from 1128 the menu of 324 stands in the middle of its column, never closer than 48 to its edges; 950–1127 the 24 a side of before; the other lists take none of it', () => {
		const view = render(Harness, { props: { widths: 'menu' } });
		expect(list()).toHaveClass('laptop:px-menu-centred', 'laptop:pt-reading-gap');
		expect(list()).toHaveClass('split:px-6', 'split:pt-section', 'split:pb-section-lg');
		lacks(list(), 'laptop:px-pane-inset', 'split:px-menu-centred', 'px-menu-centred');
		view.unmount();
		const laptop = render(Harness, { props: { widths: 'menu', from: 'laptop' } });
		expect(list()).toHaveClass(
			'laptop:px-menu-centred',
			'laptop:pt-reading-gap',
			'laptop:pb-section-lg'
		);
		lacks(list(), 'laptop:px-pane-inset');
		laptop.unmount();
		for (const widths of ['wide', 'inbox'] as const) {
			const other = render(Harness, { props: { widths } });
			lacks(list(), 'laptop:px-menu-centred');
			other.unmount();
		}
		// 62 / 68 / 140 for a row 14 inside the menu, at 1128 / 1440 / 1920: the column and its side, in numbers.
		const inset = platform.spacing['pane-inset'];
		const width = platform.spacing['split-menu'];
		const side = (frame: number) =>
			Math.max(inset, (Math.max(platform.spacing['split-menu-w-lg'], frame * 0.3) - width) / 2);
		expect([1128, 1440, 1920].map((frame) => side(frame) + 14)).toEqual([62, 68, 140]);
	});

	it('🔴 U-216.2 / D-W52-14: η σύμπτυξη — with a `rail` the menu folds: the column glides (0.32 s) between `grid-menu` and `grid-rail`, the menu of ONE width and the rail both in the page, each scrolling on its own inside the column’s line', () => {
		render(Harness, { props: { widths: 'menu', fold: true, centred: true } });
		const root = screen.getByTestId('split');
		expect(root).toHaveClass(
			'group/split-fold',
			'split:grid',
			'split:h-split',
			'split:grid-menu',
			'split:data-folded:grid-rail',
			'split:transition-[grid-template-columns]',
			'split:duration-fold',
			'split:ease-standard',
			...FRAME
		);
		expect(root).not.toHaveAttribute('data-folded');
		// The column: the line, and a box nothing leaves; the menu in it scrolls, inset as every menu.
		expect(list()).toHaveClass(
			'split:relative',
			'split:overflow-hidden',
			'split:border-r',
			'split:border-border/60'
		);
		lacks(list(), 'split:overflow-y-auto', ...MENU_INSET);
		expect(menu()?.parentElement).toBe(list());
		expect(menu()).toHaveClass(
			'split:h-full',
			'split:overflow-y-auto',
			'split:overflow-x-hidden',
			'split:overscroll-contain',
			...MENU_INSET
		);
		expect(menuBox()?.parentElement).toBe(menu());
		expect(menuBox()).toHaveClass('split:w-menu-fixed');
		expect(menuBox()).toHaveTextContent('Γραμμή πρώτη');
		expect(rail()?.parentElement).toBe(list());
		expect(rail()).toHaveClass(
			'hidden',
			'split:flex',
			'split:absolute',
			'split:inset-y-0',
			'split:left-0',
			'split:w-split-rail',
			'laptop:w-split-rail-lg',
			'split:flex-col',
			'split:items-center',
			'split:overflow-y-auto',
			'split:pt-section',
			'split:pb-section-lg',
			'laptop:pt-reading-gap'
		);
		// The menu leaves first (0.12 s) and comes back last (0.2 s after 0.12 s); the rail arrives last (0.2 s after 0.14 s).
		expect(menu()).toHaveClass(
			'split:transition-opacity',
			'split:duration-fold-in',
			'split:delay-fold-menu',
			'split:ease-standard',
			'split:group-data-folded/split-fold:invisible',
			'split:group-data-folded/split-fold:opacity-0',
			'split:group-data-folded/split-fold:transition-[opacity,visibility]',
			'split:group-data-folded/split-fold:duration-fold-out',
			'split:group-data-folded/split-fold:delay-0'
		);
		expect(rail()).toHaveClass(
			'split:invisible',
			'split:opacity-0',
			'split:transition-[opacity,visibility]',
			'split:duration-fold-out',
			'split:ease-standard',
			'split:group-data-folded/split-fold:visible',
			'split:group-data-folded/split-fold:opacity-100',
			'split:group-data-folded/split-fold:transition-opacity',
			'split:group-data-folded/split-fold:duration-fold-in',
			'split:group-data-folded/split-fold:delay-fold-rail'
		);
		// The right column is untouched: it re-centres by itself in the room it gets.
		expect(pane()).toHaveClass(...SPLIT_PANE, ...CENTRED_INSET);
		expect(centre()).toHaveClass(...CENTRE);
	});

	it('🔴 U-216.2 / D-W52-14: the button changes ONLY the state — an attribute on the root, `inert` on the hidden part, `aria-expanded` on both buttons; no class changes, nothing is drawn again, and the focus goes to the button that shows', async () => {
		const onFolded = vi.fn();
		render(Harness, { props: { widths: 'menu', fold: true, onFolded } });
		const root = screen.getByTestId('split');
		const parts = () => [root, list(), menu(), menuBox(), rail(), foldButton(), unfoldButton()];
		const nodes = parts();
		const classes = nodes.map((node) => node?.className);
		const row = screen.getByText('Γραμμή πρώτη');
		// Open: the menu is live, the rail in the page but inert.
		expect(foldButton().tagName).toBe('BUTTON');
		expect(unfoldButton().tagName).toBe('BUTTON');
		expect(foldButton()).toHaveAttribute('type', 'button');
		expect(foldButton()).toHaveAttribute('aria-expanded', 'true');
		expect(unfoldButton()).toHaveAttribute('aria-expanded', 'true');
		expect(menu()).toContainElement(foldButton());
		expect(rail()).toContainElement(unfoldButton());
		expect(inert(menu())).toBe(false);
		expect(inert(rail())).toBe(true);

		foldButton().focus();
		await fireEvent.click(foldButton());
		await waitFor(() => expect(unfoldButton()).toHaveFocus());
		expect(root).toHaveAttribute('data-folded');
		expect(onFolded).toHaveBeenLastCalledWith(true);
		expect(foldButton()).toHaveAttribute('aria-expanded', 'false');
		expect(unfoldButton()).toHaveAttribute('aria-expanded', 'false');
		expect(inert(menu())).toBe(true);
		expect(inert(rail())).toBe(false);
		// Both still in the page, the same elements with the same classes: CSS alone moves them.
		parts().forEach((node, index) => expect(node).toBe(nodes[index]));
		expect(parts().map((node) => node?.className)).toEqual(classes);
		expect(screen.getByText('Γραμμή πρώτη')).toBe(row);
		expect(menu()).toContainElement(row);

		await fireEvent.click(unfoldButton());
		await waitFor(() => expect(foldButton()).toHaveFocus());
		expect(root).not.toHaveAttribute('data-folded');
		expect(onFolded).toHaveBeenLastCalledWith(false);
		expect(foldButton()).toHaveAttribute('aria-expanded', 'true');
		expect(inert(menu())).toBe(false);
		expect(inert(rail())).toBe(true);
		parts().forEach((node, index) => expect(node).toBe(nodes[index]));
		expect(parts().map((node) => node?.className)).toEqual(classes);
	});

	it('🔴 U-216.2 / D-W52-14: the fold button is a target of 48 with no colour under the pointer (U-100), and the caller’s state folds the menu too (`bind:folded`)', async () => {
		const view = render(Harness, { props: { widths: 'menu', fold: true, folded: true } });
		expect(screen.getByTestId('split')).toHaveAttribute('data-folded');
		expect(inert(menu())).toBe(true);
		expect(inert(rail())).toBe(false);
		for (const button of [foldButton(), unfoldButton()]) {
			expect(button).toHaveAttribute('data-slot', 'split-view-fold');
			expect(button).toHaveClass('size-touch', 'hidden', 'split:inline-flex', 'rounded-md');
			expect(button.className).not.toMatch(/hover:|bg-|\[/u);
			expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
		}
		await view.rerender({ widths: 'menu', fold: true, folded: false });
		expect(screen.getByTestId('split')).not.toHaveAttribute('data-folded');
		expect(inert(menu())).toBe(false);
		expect(inert(rail())).toBe(true);
	});

	it('🔴 U-216.2 / D-W52-14 (negative): κάτω από 950 ούτε λωρίδα ούτε κουμπί — every class of the fold waits for the zone, and while the rail has no box the state is not read: the menu stays live', async () => {
		vi.stubGlobal('ResizeObserver', ManualResizeObserver);
		render(Harness, { props: { widths: 'menu', fold: true, folded: true } });
		const zoned = (node: Element | null, ...free: string[]) =>
			[...(node?.classList ?? [])].filter(
				(name) => !/^(split|laptop):/u.test(name) && !free.includes(name)
			);
		// Without a zone: the rail and the buttons are not shown, the menu and its box are plain blocks.
		expect(zoned(rail())).toEqual(['hidden']);
		expect(zoned(menu())).toEqual([]);
		expect(zoned(menuBox())).toEqual([]);
		expect(zoned(screen.getByTestId('split'))).toEqual(['group/split-fold']);
		for (const button of [foldButton(), unfoldButton()]) expect(button).toHaveClass('hidden');
		// From 950 the rail has a box: the folded menu is inert.
		ManualResizeObserver.fire();
		await tick();
		expect(inert(menu())).toBe(true);
		// The screen turns narrower than the zone: the rail is not drawn, the menu is whole and live again.
		(rail() as HTMLElement).style.display = 'none';
		ManualResizeObserver.fire();
		await tick();
		expect(inert(menu())).toBe(false);
		expect(screen.getByTestId('split')).toHaveAttribute('data-folded');
		// … and wide again: the state was kept.
		(rail() as HTMLElement).style.display = '';
		ManualResizeObserver.fire();
		await tick();
		expect(inert(menu())).toBe(true);
	});

	it('🔴 U-216.2 / D-W52-14 (negative): nothing folds without a `rail`, at another width of the list, or with `solo` — no rail, no button, no state on the root, the list as it was', async () => {
		const plain = render(Harness, { props: { widths: 'menu', folded: true } });
		expect(rail()).toBeNull();
		expect(menu()).toBeNull();
		expect(screen.queryByRole('button')).toBeNull();
		expect(screen.getByTestId('split')).not.toHaveAttribute('data-folded');
		lacks(
			screen.getByTestId('split'),
			'group/split-fold',
			'split:data-folded:grid-rail',
			'split:duration-fold'
		);
		expect(list()).toHaveClass(...SPLIT_LIST, ...MENU_INSET);
		expect(list().firstElementChild?.tagName).toBe('H1');
		plain.unmount();

		const wide = render(Harness, { props: { widths: 'wide', fold: true, folded: true } });
		expect(rail()).toBeNull();
		expect(screen.queryByRole('button')).toBeNull();
		expect(screen.getByTestId('split')).not.toHaveAttribute('data-folded');
		expect(list()).toHaveClass(...SPLIT_LIST);
		wide.unmount();

		const view = render(Harness, {
			props: { widths: 'menu', fold: true, folded: true, solo: true }
		});
		const root = screen.getByTestId('split');
		expect(root).not.toHaveAttribute('data-folded');
		lacks(root, 'group/split-fold', 'split:grid', 'split:data-folded:grid-rail');
		expect(screen.queryByRole('button')).toBeNull();
		expect(rail()?.className).toBe('hidden');
		expect(inert(rail())).toBe(true);
		expect(inert(menu())).toBe(false);
		expect(menu()?.className ?? '').toBe('');
		expect(list()).toHaveClass(...SOLO);
		// The list is the same element when something opens beside it again, and the fold is back with its state.
		const before = list();
		const row = screen.getByText('Γραμμή πρώτη');
		await view.rerender({ widths: 'menu', fold: true, folded: true, solo: false });
		expect(list()).toBe(before);
		expect(screen.getByText('Γραμμή πρώτη')).toBe(row);
		expect(root).toHaveAttribute('data-folded');
		expect(inert(menu())).toBe(true);
	});

	it('U-216.2 / D-W52-14 · D-W51-36: a folding menu `from="laptop"` waits for 1128 — the rail of 120 alone, nothing of 950', () => {
		render(Harness, { props: { widths: 'menu', fold: true, from: 'laptop' } });
		const root = screen.getByTestId('split');
		expect(root).toHaveClass(
			'group/split-fold',
			'laptop:grid-menu',
			'laptop:data-folded:grid-rail',
			'laptop:transition-[grid-template-columns]',
			'laptop:duration-fold'
		);
		expect(rail()).toHaveClass('hidden', 'laptop:flex', 'laptop:w-split-rail-lg');
		expect(menuBox()).toHaveClass('laptop:w-menu-fixed');
		expect(foldButton()).toHaveClass('hidden', 'laptop:inline-flex');
		const every = [root, list(), menu(), menuBox(), rail(), foldButton(), unfoldButton()]
			.map((node) => node?.className ?? '')
			.join(' ');
		expect(every).not.toMatch(/(^|\s)split:/u);
	});

	it('U-216.2 / D-W52-14: the fold’s measures are names of the scale — the rail under the bar’s mark (72, 120 from 1128), the menu’s one width (292, 324), 0.32 s for the column, 0.12 s out, 0.2 s in after 0.14 s (the rail) or 0.12 s (the menu)', () => {
		const { spacing } = platform;
		// The frame's inset on each side of the mark (24 + 24 + 24; 48 + 24 + 48): the prototype's 74 / 122 with its 26 mark.
		expect(spacing['split-rail']).toBe(2 * 24 + spacing['brand-mark']);
		expect(spacing['split-rail-lg']).toBe(2 * spacing['pane-inset'] + spacing['brand-mark']);
		expect([spacing['split-rail'], spacing['split-rail-lg']]).toEqual([72, 120]);
		expect(spacing['split-menu-w'] - 2 * 24).toBe(292);
		expect(utilityOf('grid-rail')).toContain('var(--spacing-split-rail) minmax(0, 1fr)');
		expect(utilityOf('grid-rail')).toMatch(
			/--breakpoint-laptop.*var\(--spacing-split-rail-lg\) minmax\(0, 1fr\)/u
		);
		expect(utilityOf('w-menu-fixed')).toContain(
			'width: calc(var(--spacing-split-menu-w) - --spacing(12));'
		);
		expect(utilityOf('w-menu-fixed')).toMatch(
			/--breakpoint-laptop.*width: var\(--spacing-split-menu\);/u
		);
		expect(motion.duration.fold).toBe(320);
		expect(motion.duration['fold-out']).toBe(120);
		expect(motion.duration['fold-in']).toBe(200);
		expect(motion.delay).toEqual({ 'fold-rail': 140, 'fold-menu': 120 });
		const css = tokensToCss();
		expect(css).toContain('--transition-duration-fold: 320ms;');
		expect(css).toContain('--transition-delay-fold-rail: 140ms;');
		expect(css).toContain('--transition-delay-fold-menu: 120ms;');
	});
});
