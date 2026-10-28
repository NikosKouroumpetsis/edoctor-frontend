import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import SearchTrigger from './search-trigger.svelte';
import { layoutOf } from './index';

const pillOf = () => screen.getByRole('button');

describe('SearchTrigger', () => {
	it('U-03.1 (K4.1, D2): one line — the floating card pill, the muted 20 glyph and the 16 semibold words', async () => {
		const onclick = vi.fn();
		const { container } = render(SearchTrigger, {
			props: { placeholder: 'Αναζήτηση γιατρού', onclick, testId: 'home-pill' }
		});
		const pill = pillOf();
		expect(pill).toHaveClass(
			'min-h-touch',
			'w-full',
			'rounded-full',
			'bg-card',
			'shadow-floating',
			'px-5',
			'py-5'
		);
		expect(pill).not.toHaveClass('border', 'py-3');
		expect(pill).toHaveAttribute('data-testid', 'home-pill');
		expect(pill.firstElementChild).toHaveClass(
			'flex',
			'flex-row',
			'items-center',
			'justify-center',
			'gap-3'
		);
		expect(container.querySelector('[data-icon="search"]')).toHaveClass(
			'icon-md',
			'text-muted-foreground'
		);
		expect(screen.getByText('Αναζήτηση γιατρού')).toHaveClass(
			'text-body-lg',
			'leading-relaxed',
			'font-semibold',
			'text-foreground/80'
		);
		expect(pill).toHaveAccessibleName('Αναζήτηση γιατρού');
		await userEvent.setup({ delay: null }).click(pill);
		expect(onclick).toHaveBeenCalledOnce();
	});

	it('U-03.1 (K4.1, D2): two lines — the 15 semibold title over the muted 14 line, each one line, py-3', () => {
		const { container } = render(SearchTrigger, {
			props: { title: 'Καρδιολόγος', subtitle: 'Αττική · Επόμενες 3 ημέρες', onclick: () => {} }
		});
		expect(pillOf()).toHaveClass('px-5', 'py-3');
		expect(pillOf()).not.toHaveClass('py-5');
		expect(pillOf().firstElementChild).toHaveClass('flex', 'flex-col', 'items-center');
		expect(screen.getByText('Καρδιολόγος')).toHaveClass(
			'line-clamp-1',
			'text-body-md',
			'font-semibold',
			'text-foreground'
		);
		expect(screen.getByText('Αττική · Επόμενες 3 ημέρες')).toHaveClass(
			'line-clamp-1',
			'text-body-sm',
			'text-muted-foreground'
		);
		expect(container.querySelector('[data-icon="search"]')).toBeNull();
		expect(pillOf()).toHaveAccessibleName('Καρδιολόγος');
	});

	it('U-03.1 (a11y): the caller’s name wins; a two-line pill without a subtitle draws the title alone', () => {
		render(SearchTrigger, {
			props: { title: 'Καρδιολόγος', 'aria-label': 'Αλλαγή αναζήτησης', onclick: () => {} }
		});
		expect(pillOf()).toHaveAccessibleName('Αλλαγή αναζήτησης');
		expect(pillOf().querySelectorAll('span span')).toHaveLength(1);
	});

	it('U-05.4 (zones by CSS): below 744 only — the pair of `SearchBar`; `none` keeps it at every width', () => {
		const phone = render(SearchTrigger, { props: { placeholder: 'Αναζήτηση' } });
		expect(phone.container.querySelector('[data-slot="search-trigger"]')).toHaveClass(
			'flex',
			'flex-col',
			'gap-3',
			'tablet:hidden'
		);
		phone.unmount();
		const every = render(SearchTrigger, { props: { placeholder: 'Αναζήτηση', hideFrom: 'none' } });
		expect(every.container.querySelector('[data-slot="search-trigger"]')).not.toHaveClass(
			'tablet:hidden'
		);
	});

	it('U-03.1 (negative): without an action the pill is inert (the application’s `disabled={!onPress}`)', async () => {
		render(SearchTrigger, { props: { placeholder: 'Αναζήτηση' } });
		expect(pillOf()).toBeDisabled();
	});

	it('U-03.1 (light/dark): only theme tokens, the same classes in both themes (no `dark:` variant)', () => {
		const { container } = render(SearchTrigger, {
			props: { title: 'Καρδιολόγος', subtitle: 'Αττική', onclick: () => {} }
		});
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});

	it('layoutOf gives the pressed pill’s rect, the origin a modal zooms out of', () => {
		const element = document.createElement('button');
		element.getBoundingClientRect = () =>
			({ left: 24, top: 80, width: 327, height: 64 }) as DOMRect;
		expect(layoutOf(element)).toEqual({ height: 64, width: 327, x: 24, y: 80 });
	});

	it('U-09.9: below 1128 the pill is the application’s, token for token — its height, words, glyph, insets, corner, shadow', () => {
		const app = readFileSync(
			resolve(process.cwd(), '../application/src/shared/ui/molecules/search-trigger/index.tsx'),
			'utf8'
		);
		const appTokens = (pattern: RegExp) =>
			(pattern.exec(app)?.[1] ?? '').split(/\s+/).filter(Boolean);
		const pill = appTokens(/cx\('([^']+)', isTwoLine/);
		const oneLine = appTokens(/isTwoLine \? '[^']+' : '([^']+)'/);
		const twoLine = appTokens(/isTwoLine \? '([^']+)'/);
		const words = appTokens(/<Text className="([^"]+)">\{placeholder\}/);
		const row = appTokens(/<View className="([^"]+)">\s*<Ionicons/);
		expect(pill).toEqual(['bg-card', 'shadow-floating', 'min-h-touch', 'w-full', 'rounded-full']);
		expect(app).toContain('size={icon.md}');
		const one = render(SearchTrigger, {
			props: { placeholder: 'Ξεκινήστε αναζήτηση γιατρού', hideFrom: 'none', onclick: () => {} }
		});
		const button = one.getByRole('button', { name: 'Ξεκινήστε αναζήτηση γιατρού' });
		expect(button).toHaveClass(...pill, ...oneLine);
		expect(one.getByText('Ξεκινήστε αναζήτηση γιατρού')).toHaveClass(...words);
		expect(one.getByText('Ξεκινήστε αναζήτηση γιατρού').parentElement).toHaveClass(...row);
		expect(button.querySelector('[data-icon="search"]')).toHaveClass(
			'icon-md',
			'text-muted-foreground'
		);
		// The words never take the web's own sizes: 16 semibold on the 28 line, as the application's (68 high).
		expect(button.getAttribute('class')).not.toMatch(/(^|\s)h-|text-(title|heading|display)/);
		one.unmount();
		const two = render(SearchTrigger, {
			props: { title: 'Καρδιολόγος', subtitle: 'Αττική', hideFrom: 'none', onclick: () => {} }
		});
		expect(two.getByRole('button', { name: 'Καρδιολόγος' })).toHaveClass(...pill, ...twoLine);
	});
});
