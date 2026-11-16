import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import ModePill from './mode-pill.svelte';

describe('ModePill (wave 5.1 · screens 64, 76)', () => {
	it('below 744 only, over the tab bar, the dark pill with ⇄; a link to the mode’s page, pressed in place', async () => {
		const onclick = vi.fn((event: MouseEvent) => event.preventDefault());
		render(ModePill, {
			props: { label: 'Λειτουργία γιατρού', href: '/doctor', onclick, testId: 'pill' }
		});
		const pill = screen.getByTestId('pill');
		expect(pill.tagName).toBe('A');
		expect(pill).toHaveAttribute('href', '/doctor');
		expect(pill).toHaveTextContent('Λειτουργία γιατρού');
		expect(pill.className).toMatch(/\btablet:hidden\b/u);
		expect(pill.className).toMatch(/\bfixed\b/u);
		expect(pill.className).toContain('bottom-bar-bottom');
		expect(pill.className).not.toMatch(/hover:/u);
		await userEvent.click(pill);
		expect(onclick).toHaveBeenCalledTimes(1);
	});

	it('a button while on its way takes no second press', async () => {
		const onclick = vi.fn();
		render(ModePill, { props: { label: 'Λειτουργία ασθενή', onclick, disabled: true } });
		await userEvent.click(screen.getByRole('button', { name: 'Λειτουργία ασθενή' }));
		expect(onclick).not.toHaveBeenCalled();
	});
});
