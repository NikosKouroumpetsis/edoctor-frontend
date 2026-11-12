import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { platform } from '$shared/design/tokens';
import { projectRoot } from '../../../../../tests/architecture/source-scan';
import BottomNav from './bottom-nav.svelte';
import { sampleBottomNavItems } from './bottom-nav.sample';

describe('BottomNav', () => {
	it('U-84 Π5: a tab’s badge: its count on the glyph, its words aloud; no badge, no mark', () => {
		const { container } = render(BottomNav, {
			props: {
				items: [
					{
						key: 'a',
						label: 'Μηνύματα',
						icon: 'chatbubble-outline',
						badge: '9+',
						badgeLabel: '12 αδιάβαστες'
					},
					{ key: 'b', label: 'Προφίλ', icon: 'person-outline' }
				],
				'aria-label': 'Πλοήγηση'
			}
		});
		const badges = container.querySelectorAll('[data-slot="bottom-nav-badge"]');
		expect(badges).toHaveLength(1);
		expect(badges[0]).toHaveTextContent('9+');
		expect(screen.getByRole('button', { name: /12 αδιάβαστες/u })).toBeInTheDocument();
	});

	// Rewrites the first U-03.8 guard (a full-width bar on the lower edge, the current tab in primary, the rest
	// muted): U-16.10/U-17.1 take flower-application's glass capsule. U-134.6 / D-W4-53 (wave 4.0): 336 ⇒ 384 for five tabs.
	it('U-16.10/U-17.1 · U-134.6: the glass capsule — 384 (D-W4-53) in the middle and 8 off the screen’s sides at most, 16 over the safe area, 4 inside, white 50 % blurred 7 under a 65 % rim', () => {
		render(BottomNav, { props: { items: sampleBottomNavItems, 'aria-label': 'Πλοήγηση' } });
		const nav = screen.getByRole('navigation', { name: 'Πλοήγηση' });
		expect(nav).toHaveClass(
			'fixed',
			'bottom-safe-area',
			'left-1/2',
			'-translate-x-1/2',
			'w-tab-capsule-w',
			'max-w-tab-capsule',
			'rounded-full',
			'p-1',
			'bg-card/50',
			'border-card/65',
			'backdrop-blur-glass',
			'backdrop-saturate-180',
			'shadow-overlay'
		);
		expect(nav).not.toHaveClass('inset-x-0', 'bottom-0', 'border-t', 'bg-card', 'max-w-full');
	});

	it('U-134.6 / D-W4-53: 384 on the token, never closer than 8 to the sides (the utility the site builds)', () => {
		expect(platform.spacing['tab-capsule-w']).toBe(384);
		const layout = readFileSync(join(projectRoot, 'src/routes/layout.css'), 'utf8');
		expect(layout).toMatch(
			/@utility max-w-tab-capsule \{\s*max-width: calc\(100vw - --spacing\(4\)\);\s*\}/u
		);
	});

	it('D-W4-53: below 360 (`narrow-phone`) the words close up, so «Εξερευνήστε» keeps its room among five', () => {
		render(BottomNav, { props: { items: sampleBottomNavItems, 'aria-label': 'n' } });
		for (const word of ['Εξερευνήστε', 'Ραντεβού', 'Προφίλ']) {
			expect(screen.getByText(word)).toHaveClass('text-label-md', 'narrow-phone:tracking-tight');
		}
	});

	// Rewrites the first D-W4-65 guard (packed only under 400): the second live check (w4-live-web-2 Γ) measured 3,4 px
	// between «Εξερευνήστε» and «Αγαπημένα» at 400 / 402, where five equal shares of 74,8 are narrower than the word (77,1).
	it('🔴 D-W4-65 · D-W4-73 (live check w4-live-web-2 Γ): FIVE tabs are packed at EVERY width of the capsule — each tab as wide as its own word, the room left shared out as equal gaps between them, never under 4; the words at 11 (the prototype’s `.a-tabs.web`, a token) only under 400, at 12 from it', () => {
		render(BottomNav, { props: { items: sampleBottomNavItems, 'aria-label': 'n' } });
		expect(sampleBottomNavItems).toHaveLength(5);
		const row = screen.getByRole('list');
		expect(row).toHaveClass('flex', 'flex-row', 'justify-between', 'gap-1');
		// The packing is no longer a matter of the screen's width: at 400 / 402 / 430 too. Rewrites the bare «no
		// `capsule-narrow` on the row» (U-157): the row's 2 a side for the bubbles of the two ends is the one thing it reads.
		expect(row.className).not.toMatch(/capsule-narrow:(?!px-0(\s|$))/u);
		for (const item of row.querySelectorAll('li')) {
			expect(item).toHaveClass('flex', 'flex-none');
			expect(item).not.toHaveClass('flex-1');
			expect(item.className).not.toMatch(/capsule-narrow/u);
		}
		for (const word of ['Εξερευνήστε', 'Αγαπημένα', 'Ραντεβού', 'Μηνύματα', 'Προφίλ']) {
			const label = screen.getByText(word);
			// 12 from 400 (the shared scale's smallest), 11 under it alone (the web's own role, D-W4-73).
			expect(label).toHaveClass(
				'text-label-md',
				'capsule-narrow:text-tab-label',
				'whitespace-nowrap'
			);
			expect(label).not.toHaveClass('text-tab-label');
			expect(label).toHaveClass('narrow-phone:tracking-tight', 'font-semibold');
		}
		for (const tab of document.querySelectorAll('[data-slot="bottom-nav-tab"]')) {
			expect(tab).toHaveClass('min-h-touch', 'min-w-touch');
		}
		expect(platform.typography['tab-label']).toEqual({ size: 11, weight: 600, lineHeight: 1.4 });
		// Under 400 the capsule is narrower than its whole 384 (8 a side): the words' size alone reads it.
		expect(platform.spacing['tab-capsule-fit']).toBe(platform.spacing['tab-capsule-w'] + 16);
		const layout = readFileSync(join(projectRoot, 'src/routes/layout.css'), 'utf8');
		expect(layout).toMatch(
			/@custom-variant capsule-narrow \(@media \(width < --theme\(--spacing-tab-capsule-fit\)\)\);/u
		);
		const theme = readFileSync(join(projectRoot, 'src/generated/design-tokens.css'), 'utf8');
		expect(theme).toMatch(/--text-tab-label: 11px;/u);
	});

	it('🔴 U-157 (bug #7, measured w4-measure-web §1): a packed tab spreads out of its own box by the air its bubble gains — 6 a side from 400, 4 under 400, none under 360 — so no word and no gap moves; the row keeps 2 a side from 400 for the bubbles of the two ends', () => {
		render(BottomNav, { props: { items: sampleBottomNavItems, 'aria-label': 'n' } });
		const row = screen.getByRole('list');
		expect(row).toHaveClass('px-0.5', 'capsule-narrow:px-0');
		for (const item of row.querySelectorAll('li')) {
			// The share keeps the 48 target and the word's width; the tab alone grows over it.
			expect(item).toHaveClass('flex-none', 'min-w-touch');
			expect(item.className).not.toMatch(/-mx-|px-/u);
		}
		const tabs = document.querySelectorAll('[data-slot="bottom-nav-tab"]');
		expect(tabs).toHaveLength(5);
		for (const tab of tabs) {
			expect(tab).toHaveClass('-mx-1.5', 'px-1.5', 'capsule-narrow:-mx-1', 'capsule-narrow:px-1');
			expect(tab).toHaveClass(
				'capsule-narrow:narrow-phone:mx-0',
				'capsule-narrow:narrow-phone:px-0'
			);
			// The shape, the height and the target are the bubble's own, unchanged.
			expect(tab).toHaveClass('rounded-full', 'min-h-touch', 'min-w-touch', 'flex-1');
		}
	});

	it('U-157 (negative): fewer than five tabs spread nothing — no negative margin, no side padding, no row padding', () => {
		render(BottomNav, { props: { items: sampleBottomNavItems.slice(0, 4), 'aria-label': 'n' } });
		expect(screen.getByRole('list').className).not.toMatch(/px-/u);
		for (const tab of document.querySelectorAll('[data-slot="bottom-nav-tab"]')) {
			expect(tab.className).not.toMatch(/-mx-|(^|\s|:)px-/u);
		}
	});

	// D-W4-79 corrects the wording alone (there is no bar of four on the site): the expectations are D-W4-65's, unchanged.
	it('D-W4-65 · D-W4-79 (negative): with FEWER than five tabs (nobody today — the site’s bar is always five, for a guest and a member alike) nothing changes at any width — equal shares, no packing, the words at 12', () => {
		render(BottomNav, {
			props: { items: sampleBottomNavItems.slice(0, 4), 'aria-label': 'n' }
		});
		const row = screen.getByRole('list');
		expect(row.className).not.toMatch(/capsule-narrow/u);
		expect(row).not.toHaveClass('justify-between', 'gap-1');
		for (const item of row.querySelectorAll('li')) {
			expect(item).toHaveClass('flex-1');
			expect(item).not.toHaveClass('flex-none');
			expect(item.className).not.toMatch(/capsule-narrow/u);
		}
		for (const tab of document.querySelectorAll('[data-slot="bottom-nav-tab"] > span:last-child')) {
			expect(tab).toHaveClass('text-label-md');
			expect(tab.className).not.toMatch(/capsule-narrow/u);
		}
	});

	it('U-16.10: the current tab sits in the 7 % bubble in primary text, the others in the text colour; 24 glyph over a 12/600 word', () => {
		render(BottomNav, { props: { items: sampleBottomNavItems, 'aria-label': 'n' } });
		const current = screen.getByRole('link', { name: 'Εξερευνήστε' });
		expect(current).toHaveAttribute('aria-current', 'page');
		expect(current).toHaveClass(
			'bg-foreground/7',
			'text-primary-text',
			'rounded-full',
			'min-h-touch',
			'flex-1'
		);
		expect(current.querySelector('[data-icon="search"]')).toHaveClass('icon-lg');
		const rest = screen.getByRole('button', { name: 'Αγαπημένα' });
		expect(rest).toHaveClass('text-foreground', 'focus-visible:ring-3');
		expect(rest).not.toHaveClass('bg-foreground/7', 'text-muted-foreground');
		expect(rest.querySelector('[data-icon="heart-outline"]')).not.toBeNull();
		expect(screen.getByText('Προφίλ')).toHaveClass('text-label-md', 'font-semibold');
	});

	// Rewrites «U-26.1: the web keeps three tabs»: U-82.3 adds «Μηνύματα»; rewrites «U-81.2 / U-82.3: κάψουλα 4
	// καρτελών»: U-134.6 (wave 4.0) adds «Ραντεβού», third, the application's order (U-81.4).
	it('U-81.2 / U-134.6: κάψουλα 5 καρτελών — «Εξερευνήστε · Αγαπημένα · Ραντεβού · Μηνύματα · Προφίλ»', () => {
		render(BottomNav, { props: { items: sampleBottomNavItems, 'aria-label': 'n' } });
		const tabs = document.querySelectorAll('[data-slot="bottom-nav-tab"]');
		expect([...tabs].map((tab) => tab.textContent?.trim())).toEqual([
			'Εξερευνήστε',
			'Αγαπημένα',
			'Ραντεβού',
			'Μηνύματα',
			'Προφίλ'
		]);
	});

	// Rewrites the U-03.8 zone guard (hidden from the laptop by default): U-16.3 hands the frame to the top bar at 744.
	it('U-16.3: hides from 744 by default (the top bar takes over there) and from the zone the caller names', () => {
		const view = render(BottomNav, { props: { items: sampleBottomNavItems, 'aria-label': 'n' } });
		expect(screen.getByRole('navigation')).toHaveClass('tablet:hidden');
		expect(screen.getByRole('navigation')).not.toHaveClass('laptop:hidden');
		view.unmount();
		render(BottomNav, {
			props: { items: sampleBottomNavItems, 'aria-label': 'n', hideFrom: 'laptop' }
		});
		expect(screen.getByRole('navigation')).toHaveClass('laptop:hidden');
	});

	it('U-03.8: a tab without an href is a button the caller wires', async () => {
		const user = userEvent.setup({ delay: null });
		const onclick = vi.fn();
		const items = [{ key: 'x', label: 'Μηνύματα', icon: 'chatbubble-outline' as const, onclick }];
		render(BottomNav, { props: { items, 'aria-label': 'n' } });
		await user.click(screen.getByRole('button', { name: 'Μηνύματα' }));
		expect(onclick).toHaveBeenCalledOnce();
	});
});
