import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './chip-group.harness.svelte';

describe('ChipGroup', () => {
	it('U-03.1: lays its chips in the application row (flex-row flex-wrap gap-2)', () => {
		render(Harness, { props: { type: 'multiple' } });
		const group = screen.getByRole('group', { name: 'Ώρα' });
		expect(group).toHaveClass('flex', 'flex-row', 'flex-wrap', 'gap-2');
		expect(screen.getByRole('button', { name: 'morning' })).toHaveAttribute('aria-pressed', 'true');
	});

	it('U-03.1: single is one Tab stop on the chosen radio, and ArrowRight moves the choice', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness, { props: { type: 'single', initial: 'noon' } });
		expect(screen.getByRole('radiogroup', { name: 'Ώρα' })).toBeInTheDocument();
		const radios = screen.getAllByRole('radio');
		expect(radios).toHaveLength(3);
		expect(radios.map((radio) => radio.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
		screen.getByRole('button', { name: 'Πριν' }).focus();
		await user.tab();
		expect(radios[1]).toHaveFocus();
		await user.keyboard('{ArrowRight}');
		expect(radios[2]).toHaveFocus();
		expect(radios[2]).toHaveAttribute('aria-checked', 'true');
		expect(radios[1]).toHaveAttribute('aria-checked', 'false');
		expect(radios.map((radio) => radio.getAttribute('tabindex'))).toEqual(['-1', '-1', '0']);
		await user.tab();
		expect(radios[2]).not.toHaveFocus();
		expect(document.activeElement?.getAttribute('role')).not.toBe('radio');
	});

	it('U-03.1: with nothing chosen the first radio is the Tab stop', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness, { props: { type: 'single', initial: '' } });
		const radios = screen.getAllByRole('radio');
		expect(radios.map((radio) => radio.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
		screen.getByRole('button', { name: 'Πριν' }).focus();
		await user.tab();
		expect(radios[0]).toHaveFocus();
	});

	it('U-03.1: in single the arrows from a removable chip neither move nor change the choice (NIT-B)', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness, { props: { type: 'single', initial: 'noon', withRemovable: true } });
		const removable = screen.getByRole('button', { name: 'Επιλεγμένο' });
		expect(removable).not.toHaveAttribute('role');
		expect(removable).not.toHaveAttribute('tabindex');
		removable.focus();
		await user.keyboard('{ArrowRight}');
		expect(removable).toHaveFocus();
		await user.keyboard('{ArrowLeft}');
		expect(removable).toHaveFocus();
		const radios = screen.getAllByRole('radio');
		expect(radios.map((radio) => radio.getAttribute('aria-checked'))).toEqual([
			'false',
			'true',
			'false'
		]);
		radios[1].focus();
		await user.keyboard('{ArrowRight}');
		expect(radios[2]).toHaveAttribute('aria-checked', 'true');
	});

	it('U-03.1: multiple keeps every chip a toggle in the Tab order', () => {
		render(Harness, { props: { type: 'multiple' } });
		for (const chip of screen.getAllByRole('button').filter((b) => b.dataset.slot === 'chip'))
			expect(chip).not.toHaveAttribute('tabindex');
	});
});
