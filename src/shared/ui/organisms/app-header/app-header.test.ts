import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import AppHeader from './app-header.svelte';

const part = (html: string) => createRawSnippet(() => ({ render: () => html }));

// jsdom has no `inert` IDL attribute: Svelte sets the property, as a browser reads it.
const inert = (node: Element | null) =>
	(node as (HTMLElement & { inert?: boolean }) | null)?.inert === true;

const scrollTo = (y: number) =>
	Object.defineProperty(window, 'scrollY', { value: y, configurable: true, writable: true });

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
});
