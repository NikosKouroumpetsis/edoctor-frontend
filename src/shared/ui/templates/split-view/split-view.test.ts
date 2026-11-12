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
});
