import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { containers, platform } from '$shared/design/tokens';
import { projectRoot } from '../../../../../tests/architecture/source-scan';
import AppHeader from './app-header.svelte';

const part = (html: string) => createRawSnippet(() => ({ render: () => html }));

// jsdom has no `inert` IDL attribute: Svelte sets the property, as a browser reads it.
const inert = (node: Element | null) =>
	(node as (HTMLElement & { inert?: boolean }) | null)?.inert === true;

const scrollTo = (y: number) =>
	Object.defineProperty(window, 'scrollY', { value: y, configurable: true, writable: true });

const content = () => document.querySelector('[data-slot="app-header-content"]') as HTMLElement;
const navBox = () => document.querySelector('[data-slot="app-header-nav"]') as HTMLElement;
/** None of `classes` (jest-dom's negated `toHaveClass` passes when only ONE of several is missing). */
const lacks = (node: Element, ...classes: string[]) => {
	for (const name of classes) expect(node, name).not.toHaveClass(name);
};
const PAGE_FRAME = ['tablet:max-w-wide', 'tablet:px-6', 'laptop:px-pane-inset'];
const PAGE_NAV = [
	'laptop:absolute',
	'laptop:inset-y-0',
	'laptop:left-1/2',
	'laptop:flex-none',
	'laptop:-translate-x-1/2'
];
const SPLIT_PAGE_FRAME = [
	'split:split-page:max-w-wide',
	'split:split-page:px-6',
	'laptop:split-page:px-pane-inset'
];

const parts = {
	brand: part('<a href="/">Αρχική</a>'),
	nav: part('<nav aria-label="Κύρια">Σύνδεσμοι</nav>'),
	compact: part('<button>Αναζήτηση</button>'),
	actions: part('<button>Μενού</button>')
};

describe('AppHeader', () => {
	// Rewrites U-03.8 (the size-container bar on the page container): U-16.8/U-17.3 take apple.com's bar instead.
	it('U-16.8: apple.com’s bar — sticky 64, frosted white 80 % (blur 20, saturate 180 %), the 980 content (1024 box, 22 a side)', () => {
		render(AppHeader, { props: parts });
		const header = screen.getByRole('banner');
		expect(header).toHaveClass(
			'sticky',
			'top-0',
			'z-50',
			'h-bar-top',
			'bg-card/80',
			'backdrop-blur-bar',
			'backdrop-saturate-180'
		);
		expect(header).not.toHaveClass('@container');
		const content = header.firstElementChild as HTMLElement;
		expect(content).toHaveClass('mx-auto', 'max-w-bar-content', 'px-5.5', 'justify-between');
		expect(content).not.toHaveClass('container-page');
		expect(content.lastElementChild).toContainElement(
			screen.getByRole('button', { name: 'Μενού' })
		);
	});

	it('U-16.8: the hairline shows only once the page has scrolled', async () => {
		scrollTo(0);
		render(AppHeader, { props: parts });
		const header = screen.getByRole('banner');
		expect(header).toHaveAttribute('data-scrolled', 'false');
		expect(header).toHaveClass('border-transparent', 'data-[scrolled=true]:border-border');
		scrollTo(120);
		await fireEvent.scroll(window);
		expect(header).toHaveAttribute('data-scrolled', 'true');
		scrollTo(0);
		await fireEvent.scroll(window);
		expect(header).toHaveAttribute('data-scrolled', 'false');
	});

	it('U-16.3: no top bar on the phone — `showFrom="tablet"` shows it from 744 only', () => {
		const phoneless = render(AppHeader, { props: { ...parts, showFrom: 'tablet' } });
		expect(screen.getByRole('banner')).toHaveClass('hidden', 'tablet:block');
		phoneless.unmount();
		render(AppHeader, { props: parts });
		expect(screen.getByRole('banner')).not.toHaveClass('hidden');
	});

	it('U-16.7: the compact search takes the navigation’s place — one of the two is live at a time, faded and scaled', async () => {
		const view = render(AppHeader, { props: { ...parts, compactOn: false } });
		const nav = document.querySelector('[data-slot="app-header-nav"]') as HTMLElement;
		const compact = document.querySelector('[data-slot="app-header-compact"]') as HTMLElement;
		expect(compact).toHaveAttribute('data-state', 'closed');
		expect(inert(compact)).toBe(true);
		expect(compact).toHaveClass(
			'data-[state=closed]:opacity-0',
			'data-[state=closed]:scale-92',
			'duration-standard',
			'ease-standard'
		);
		expect(inert(nav)).toBe(false);
		await view.rerender({ ...parts, compactOn: true });
		expect(compact).toHaveAttribute('data-state', 'open');
		expect(inert(compact)).toBe(false);
		expect(inert(nav)).toBe(true);
		expect(nav).toHaveClass('opacity-0', 'pointer-events-none');
	});

	it('🔴 U-215.3 / D-W52-12 (negative): without `frame` the bar is as it was — the 1024 box, 22 a side, the links in the row — and takes no class of the page’s frame', () => {
		render(AppHeader, { props: parts });
		expect(screen.getByRole('banner')).toHaveAttribute('data-frame', 'box');
		expect(content()).toHaveClass('mx-auto', 'max-w-bar-content', 'px-5.5', 'justify-between');
		expect(content()).toBe(screen.getByRole('banner').firstElementChild);
		lacks(content(), ...PAGE_FRAME, ...SPLIT_PAGE_FRAME);
		expect(navBox()).toHaveClass('min-w-0', 'flex-1', 'justify-center');
		lacks(navBox(), ...PAGE_NAV);
		expect(content().className + navBox().className).not.toMatch(/split-page:/u);
	});

	it('🔴 U-215.3 / D-W52-12: `frame="page"` is ALWAYS the page’s frame — from 744 as wide as the page (1920 at most, centred), 24 from its edges and 48 from 1128, the links in the exact middle from 1128, the mark and the menu at the ends', () => {
		render(AppHeader, { props: { ...parts, frame: 'page' } });
		expect(screen.getByRole('banner')).toHaveAttribute('data-frame', 'page');
		expect(content()).toHaveClass('relative', 'mx-auto', 'justify-between', ...PAGE_FRAME);
		// Below 744 the box it was: the frame starts where the bar of every reader starts.
		expect(content()).toHaveClass('max-w-bar-content', 'px-5.5');
		expect(navBox()).toHaveClass(...PAGE_NAV);
		// Up to 1127 the links stay in the row, between the mark and the menu.
		expect(navBox()).toHaveClass('flex', 'flex-1', 'justify-center');
		lacks(navBox(), 'absolute', 'left-1/2', 'tablet:absolute', 'split:absolute');
		// Whatever page it is: nothing of it waits for a `SplitView`.
		expect(content().className + navBox().className).not.toMatch(/split-page:/u);
		expect(content().firstElementChild).toContainElement(
			screen.getByRole('link', { name: 'Αρχική' })
		);
		expect(content().lastElementChild).toContainElement(
			screen.getByRole('button', { name: 'Μενού' })
		);
		expect(content().className + navBox().className).not.toMatch(/\[/u);
		// The numbers behind the names: 1920, 24 (6 steps of 4), 48.
		expect(containers.wide).toBe(1920);
		expect(platform.spacing['pane-inset']).toBe(48);
	});

	it('🔴 U-215.3 / D-W52-12: `frame="split-page"` takes the page’s frame from 950 ONLY on a page with a `SplitView` (`split-page:`, CSS alone — the same HTML on every page); elsewhere the 1024 box, and the links never leave the row', () => {
		render(AppHeader, { props: { ...parts, frame: 'split-page' } });
		expect(screen.getByRole('banner')).toHaveAttribute('data-frame', 'split-page');
		expect(content()).toHaveClass('mx-auto', 'max-w-bar-content', 'px-5.5', ...SPLIT_PAGE_FRAME);
		// Nothing of the frame without the variant, and nothing below 950.
		lacks(
			content(),
			...PAGE_FRAME,
			'max-w-wide',
			'split:max-w-wide',
			'tablet:split-page:max-w-wide'
		);
		lacks(navBox(), ...PAGE_NAV);
		expect(navBox()).toHaveClass('flex-1', 'justify-center');
		expect(content().className + navBox().className).not.toMatch(/\[/u);
		// The variant reads the template's own mark in the page, so the server's HTML is already right (no state).
		const css = readFileSync(join(projectRoot, 'src/routes/layout.css'), 'utf8');
		expect(css).toContain("@custom-variant split-page (body:has([data-slot='split-view']) &);");
	});

	it('D-W52-12: the compact part still takes the links’ place under either frame', () => {
		for (const frame of ['page', 'split-page'] as const) {
			const view = render(AppHeader, { props: { ...parts, frame, compactOn: true } });
			expect(inert(navBox())).toBe(true);
			expect(navBox()).toHaveClass('opacity-0', 'pointer-events-none');
			expect(document.querySelector('[data-slot="app-header-compact"]')).toHaveAttribute(
				'data-state',
				'open'
			);
			view.unmount();
		}
	});
});
