import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Card, { cardShellClasses } from './card.svelte';
import { CardContent, CardFooter, CardHeader } from './index';

describe('Card', () => {
	it('renders the card root slot', () => {
		const { container } = render(Card);
		expect(container.querySelector('[data-slot="card"]')).toBeInTheDocument();
	});

	it('U-02.2 (K6): cardShellClasses is the application’s Card, class for class (a column on the web)', () => {
		expect(cardShellClasses.split(' ').sort()).toEqual(
			[
				'border-border/70',
				'bg-card/95',
				'shadow-soft',
				'rounded-xl',
				'border',
				'p-6',
				'flex',
				'flex-col'
			].sort()
		);
		expect(cardShellClasses).not.toMatch(/\b(tablet|split|laptop|desktop|wide|dark):/);
	});

	// U-09.2 (owner 5ζ: «το προτιμώ όπως είναι στο application») replaced the shadcn root (`border-border bg-card
	// shadow-raised`, a `size` of `gap/py`) with the application's one shell; the old size test went with `size`.
	it('U-09.2: the root is the application’s card — its shell class for class, no size, the caller’s gap', () => {
		const { container } = render(Card, { props: { class: 'gap-3' } });
		const root = container.querySelector('[data-slot="card"]');
		expect(root).toHaveClass(...cardShellClasses.split(' '), 'text-card-foreground', 'gap-3');
		// One class per assert: `.not.toHaveClass(a, b)` passes as soon as one of them is missing.
		for (const former of ['border-border', 'bg-card', 'shadow-raised', 'py-6', 'gap-6']) {
			expect(root).not.toHaveClass(former);
		}
		const app = readFileSync(
			resolve(process.cwd(), '../application/src/shared/ui/molecules/card/index.tsx'),
			'utf8'
		);
		const appClasses = /cx\('([^']+)', className\)/.exec(app)?.[1].split(' ') ?? [];
		expect(appClasses.length).toBeGreaterThan(4);
		for (const name of appClasses) expect(root, name).toHaveClass(name);
	});

	it('U-09.2: the parts sit in the shell’s 24 inset (no second inset of their own)', () => {
		for (const part of [CardHeader, CardContent, CardFooter]) {
			const { container, unmount } = render(part);
			const element = container.firstElementChild as HTMLElement;
			expect(element.className).not.toMatch(/(^|\s)px-6(\s|$)/);
			unmount();
		}
	});
});
