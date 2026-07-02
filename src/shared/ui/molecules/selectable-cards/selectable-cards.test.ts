import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './selectable-cards.harness.svelte';

describe('SelectableCards', () => {
	it('single mode keeps exactly one card selected and re-selecting keeps it', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness, { props: { type: 'single' } });
		const alpha = screen.getByRole('radio', { name: /Alpha/ });
		const beta = screen.getByRole('radio', { name: /Beta/ });

		await user.click(alpha);
		expect(alpha).toHaveAttribute('aria-checked', 'true');
		await user.click(beta);
		expect(beta).toHaveAttribute('aria-checked', 'true');
		expect(alpha).toHaveAttribute('aria-checked', 'false');
		// Radiogroup semantics: clicking the selected card again keeps it selected.
		await user.click(beta);
		expect(beta).toHaveAttribute('aria-checked', 'true');
	});

	it('single mode exposes radio roles', () => {
		render(Harness, { props: { type: 'single' } });
		expect(screen.getAllByRole('radio')).toHaveLength(3);
		expect(screen.getByRole('radiogroup')).toBeInTheDocument();
	});

	it('multiple mode allows several selected cards with checkbox roles', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness, { props: { type: 'multiple' } });
		const alpha = screen.getByRole('checkbox', { name: /Alpha/ });
		const gamma = screen.getByRole('checkbox', { name: /Gamma/ });

		await user.click(alpha);
		await user.click(gamma);
		expect(alpha).toHaveAttribute('aria-checked', 'true');
		expect(gamma).toHaveAttribute('aria-checked', 'true');
		// Clicking again removes it from the selection.
		await user.click(alpha);
		expect(alpha).toHaveAttribute('aria-checked', 'false');
	});

	it('exposes a single roving tab stop on the first item when nothing is selected', () => {
		render(Harness, { props: { type: 'single' } });
		expect(screen.getByRole('radio', { name: /Alpha/ })).toHaveAttribute('tabindex', '0');
		expect(screen.getByRole('radio', { name: /Beta/ })).toHaveAttribute('tabindex', '-1');
		expect(screen.getByRole('radio', { name: /Gamma/ })).toHaveAttribute('tabindex', '-1');
	});

	it('moves the roving tab stop to the selected item', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness, { props: { type: 'single' } });
		await user.click(screen.getByRole('radio', { name: /Beta/ }));
		expect(screen.getByRole('radio', { name: /Beta/ })).toHaveAttribute('tabindex', '0');
		expect(screen.getByRole('radio', { name: /Alpha/ })).toHaveAttribute('tabindex', '-1');
	});

	it('single mode moves focus AND selects with arrow keys (vertical)', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness, { props: { type: 'single' } });
		const alpha = screen.getByRole('radio', { name: /Alpha/ });
		alpha.focus();
		await user.keyboard('{ArrowDown}');
		const beta = screen.getByRole('radio', { name: /Beta/ });
		expect(beta).toHaveFocus();
		expect(beta).toHaveAttribute('aria-checked', 'true');
	});

	it('multiple mode toggles the focused card with Space (arrows only move)', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness, { props: { type: 'multiple' } });
		const alpha = screen.getByRole('checkbox', { name: /Alpha/ });
		alpha.focus();
		await user.keyboard('{ArrowDown}');
		const beta = screen.getByRole('checkbox', { name: /Beta/ });
		expect(beta).toHaveFocus();
		// Moving does not select in multiple mode.
		expect(beta).toHaveAttribute('aria-checked', 'false');
		await user.keyboard(' ');
		expect(beta).toHaveAttribute('aria-checked', 'true');
	});
});
