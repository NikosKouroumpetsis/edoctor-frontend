import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Input from './input.svelte';

describe('Input placeholder', () => {
	it('shows the placeholder text (plain input, always visible)', () => {
		render(Input, { props: { placeholder: 'Type here…', 'aria-label': 'x' } });
		const input = screen.getByLabelText('x');
		expect(input).toHaveAttribute('placeholder', 'Type here…');
		// Visible color, never transparent.
		expect(input.className).toContain('placeholder:text-muted-foreground');
		expect(input.className).not.toContain('placeholder:text-transparent');
	});
});
