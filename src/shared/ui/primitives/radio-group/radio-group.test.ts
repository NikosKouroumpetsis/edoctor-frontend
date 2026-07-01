import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './radio-group.harness.svelte';

describe('RadioGroup', () => {
	it('selects a radio on click and deselects the rest', async () => {
		const user = userEvent.setup();
		render(Harness);
		const free = screen.getByRole('radio', { name: 'Free' });
		const pro = screen.getByRole('radio', { name: 'Pro' });

		await user.click(free);
		expect(free).toHaveAttribute('aria-checked', 'true');
		await user.click(pro);
		expect(pro).toHaveAttribute('aria-checked', 'true');
		expect(free).toHaveAttribute('aria-checked', 'false');
	});

	it('defaults item boxes to size-5 and scales with the size prop', () => {
		const def = render(Harness);
		expect(def.getAllByRole('radio')[0]).toHaveClass('size-5');
		def.unmount();

		const sm = render(Harness, { props: { size: 'sm' } });
		expect(sm.getAllByRole('radio')[0]).toHaveClass('size-4');
		sm.unmount();

		const lg = render(Harness, { props: { size: 'lg' } });
		expect(lg.getAllByRole('radio')[0]).toHaveClass('size-6');
	});

	it('keeps a single tab stop and moves selection with arrow keys', async () => {
		const user = userEvent.setup();
		render(Harness);
		const [free, pro, team] = screen.getAllByRole('radio');
		// With no selection, only the first item is tabbable.
		expect(free).toHaveAttribute('tabindex', '0');
		expect(pro).toHaveAttribute('tabindex', '-1');

		free.focus();
		await user.keyboard('{ArrowDown}');
		expect(pro).toHaveAttribute('aria-checked', 'true');
		await user.keyboard('{ArrowDown}');
		expect(team).toHaveAttribute('aria-checked', 'true');
		// Loops back to the first.
		await user.keyboard('{ArrowDown}');
		expect(free).toHaveAttribute('aria-checked', 'true');
	});
});
