import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Textarea from './textarea.svelte';

describe('Textarea placeholder', () => {
	it('shows the placeholder text (always visible)', () => {
		render(Textarea, { props: { placeholder: 'Write a message…', 'aria-label': 'msg' } });
		const el = screen.getByLabelText('msg');
		expect(el).toHaveAttribute('placeholder', 'Write a message…');
		expect(el.className).toContain('placeholder:text-muted-foreground');
		expect(el.className).not.toContain('placeholder:text-transparent');
	});
});
