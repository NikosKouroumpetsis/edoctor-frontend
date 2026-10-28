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

describe('Textarea sizes', () => {
	// U-07.1: the application's `sm | md | lg` (the web's former `default | lg | xl` boxes), `md` by default.
	it('U-07.1: md by default with the application’s box; sm and lg; invalid sets aria-invalid', () => {
		const md = render(Textarea, { props: { 'aria-label': 'msg' } });
		expect(screen.getByLabelText('msg')).toHaveClass(
			'min-h-textarea-lg',
			'px-3',
			'py-2',
			'text-body-lg'
		);
		md.unmount();
		const sm = render(Textarea, { props: { 'aria-label': 'msg', size: 'sm' } });
		expect(screen.getByLabelText('msg')).toHaveClass('min-h-textarea-md', 'px-2.5', 'py-1.5');
		sm.unmount();
		render(Textarea, { props: { 'aria-label': 'msg', size: 'lg', invalid: true } });
		expect(screen.getByLabelText('msg')).toHaveClass('min-h-textarea-xl', 'px-3.5', 'py-2.5');
		expect(screen.getByLabelText('msg')).toHaveAttribute('aria-invalid', 'true');
	});
});
