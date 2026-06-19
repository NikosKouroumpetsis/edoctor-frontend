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
});
