import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Harness from './hover-card.harness.svelte';

describe('HoverCard', () => {
	it('reveals its content when the trigger is focused', async () => {
		render(Harness);
		const trigger = screen.getByRole('link', { name: '@maria' });
		trigger.focus();
		expect(await screen.findByText(/Dr. Maria Alexiou/)).toBeInTheDocument();
	});

	// R7-1/R7-2 (U-09 round): the default is the application's 256 (`md` = `w-hover-card-w`), no longer 288.
	it('R7-2: defaults the panel width to the application’s 256 (`md`, w-hover-card-w) and applies the size prop', async () => {
		const def = render(Harness);
		def.getByRole('link', { name: '@maria' }).focus();
		const defContent = await def.findByText(/Dr. Maria Alexiou/);
		expect(defContent.closest('[data-slot="hover-card-content"]')).toHaveClass('w-hover-card-w');
		expect(defContent.closest('[data-slot="hover-card-content"]')).not.toHaveClass('w-popover-md');
		def.unmount();

		const sm = render(Harness, { props: { size: 'sm' } });
		sm.getByRole('link', { name: '@maria' }).focus();
		const smContent = await sm.findByText(/Dr. Maria Alexiou/);
		expect(smContent.closest('[data-slot="hover-card-content"]')).toHaveClass('w-popover-sm');
	});
});
