import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { field, steps } from '$shared/design/tokens';
import Input, { fieldSizes, inputSizes } from './input.svelte';

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

describe('Input sizes', () => {
	// U-07.1 renames the web's `default | lg | xl` (48 / 56 / 64) this test pinned to the application's `sm | md | lg`
	// with its boxes (48 / 48 / 56, `px-3 | px-3.5 | px-4`); the 16px text stays (iOS Safari zooms under 16).
	it('U-07.1: the application’s sizes and boxes, md by default, never under the touch target, text 16px', () => {
		expect(inputSizes).toEqual({
			sm: 'min-h-control-md px-3 text-body-lg',
			md: 'min-h-control-md px-3.5 text-body-lg',
			lg: 'min-h-control-lg px-4 text-body-lg'
		});
		render(Input, { props: { 'aria-label': 'x' } });
		expect(screen.getByLabelText('x')).toHaveClass('min-h-control-md', 'px-3.5');
	});

	it('U-07.1: `invalid` is the error look through aria-invalid (the application’s prop)', () => {
		render(Input, { props: { 'aria-label': 'x', invalid: true } });
		expect(screen.getByLabelText('x')).toHaveAttribute('aria-invalid', 'true');
	});

	it('renders the shared field geometry as classes', () => {
		const stepOf = (px: number) => px / steps.base;
		for (const [size, box] of Object.entries(field)) {
			const geometry = fieldSizes[size as keyof typeof fieldSizes];
			const classes = geometry.input.split(' ');
			expect(classes, size).toContain(`pt-${stepOf(box.paddingTop)}`);
			expect(classes, size).toContain(`pb-${stepOf(box.paddingBottom)}`);
			expect(classes, size).toContain(`text-${box.text}`);
			expect(geometry.start, size).toBe(`pl-${stepOf(box.paddingLeft)}`);
			expect(geometry.end, size).toBe(`pr-${stepOf(box.paddingLeft)}`);
		}
	});
});
