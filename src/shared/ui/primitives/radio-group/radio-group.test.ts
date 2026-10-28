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

	// U-07.1 (R4-5) replaces the web's `sm | default | lg` (16 / 20 / 24) this test pinned with the application's
	// `sm | md | lg` (20 / 24 / 32, the dot 10 / 12 / 16), `md` = the application's one radio.
	it('U-07.1: md (24, dot 12) by default, sm 20 / lg 32, always the 48 touch box', async () => {
		const user = userEvent.setup();
		const box = (container: HTMLElement) =>
			container.querySelector('[data-slot="radio-group-item-box"]');
		const dot = (container: HTMLElement) =>
			container.querySelector('[data-slot="radio-group-item-dot"]');
		const def = render(Harness);
		expect(def.getAllByRole('radio')[0]).toHaveClass('size-touch');
		expect(box(def.container)).toHaveClass('size-6');
		await user.click(def.getAllByRole('radio')[0]);
		expect(dot(def.container)).toHaveClass('size-3', 'rounded-full', 'bg-primary');
		def.unmount();

		const sm = render(Harness, { props: { size: 'sm', value: 'free' } });
		expect(sm.getAllByRole('radio')[0]).toHaveClass('size-touch');
		expect(box(sm.container)).toHaveClass('size-5');
		expect(dot(sm.container)).toHaveClass('size-2.5');
		sm.unmount();

		const lg = render(Harness, { props: { size: 'lg', value: 'free' } });
		expect(lg.getAllByRole('radio')[0]).toHaveClass('size-touch');
		expect(box(lg.container)).toHaveClass('size-control-xs');
		expect(dot(lg.container)).toHaveClass('size-4');
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
