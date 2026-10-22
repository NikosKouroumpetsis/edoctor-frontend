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
	it('never renders a control under the touch target and keeps its text at 16px', () => {
		expect(Object.keys(inputSizes)).toEqual(['default', 'lg', 'xl']);
		for (const classes of Object.values(inputSizes)) {
			expect(classes).toMatch(/\bmin-h-control-(md|lg|xl)\b/);
			expect(classes.split(' ')).toContain('text-body-lg');
		}
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
		}
	});
});
