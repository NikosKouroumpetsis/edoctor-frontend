import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import NoteField from './note-field.svelte';

const props = {
	label: 'Μήνυμα προς τον ασθενή (προαιρετικό)',
	labelAs: 'h3' as const,
	placeholder: 'Ό,τι θέλετε να ξέρει',
	value: '',
	counter: '0/500',
	error: null,
	maxLength: 500,
	height: 'short' as const,
	onInput: vi.fn(),
	testId: 'field'
};

describe('NoteField (the words under a reason, a note, a review; shared since D-W51-50)', () => {
	it('the label as the caller’s heading, the field at the caller’s bound, the counter it describes', () => {
		render(NoteField, { props });
		const field = screen.getByLabelText('Μήνυμα προς τον ασθενή (προαιρετικό)');
		expect(field).toBe(screen.getByTestId('field'));
		expect(field).toHaveAttribute('maxlength', '500');
		expect(field).toHaveAttribute('placeholder', 'Ό,τι θέλετε να ξέρει');
		expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(props.label);
		const counter = screen.getByText('0/500');
		expect(field.getAttribute('aria-describedby')).toBe(counter.id);
		expect(document.querySelector('[data-slot="note-field"]')).not.toBeNull();
	});

	it('wave 5.2 · screen 85: the label as a field’s heading by default; `labelLook="section"` a section’s quiet name (`sw.css:527` `.w-slh`, 15/600 muted)', () => {
		const { unmount } = render(NoteField, { props });
		expect(screen.getByRole('heading', { level: 3 })).toHaveClass(
			'text-body-lg',
			'font-semibold',
			'text-foreground'
		);
		unmount();
		render(NoteField, { props: { ...props, labelLook: 'section' } });
		const heading = screen.getByRole('heading', { level: 3 });
		expect(heading).toHaveClass('text-body-md', 'font-semibold', 'text-muted-foreground');
		expect(heading).not.toHaveClass('text-foreground');
	});

	it('the heights: `short` the textarea’s own 96, `note` 104, `review` 136', () => {
		const { unmount } = render(NoteField, { props });
		expect(screen.getByTestId('field')).not.toHaveClass('min-h-checkout-note');
		unmount();
		const second = render(NoteField, { props: { ...props, height: 'note' } });
		expect(screen.getByTestId('field')).toHaveClass('min-h-checkout-note');
		second.unmount();
		render(NoteField, { props: { ...props, height: 'review' } });
		expect(screen.getByTestId('field')).toHaveClass('min-h-review-comment');
	});

	it('every keystroke reaches the caller; the server’s words show under it; a help line', async () => {
		const onInput = vi.fn();
		render(NoteField, {
			props: { ...props, onInput, error: 'Πολύ μεγάλο κείμενο', help: 'Το βλέπει ο ασθενής.' }
		});
		await fireEvent.input(screen.getByTestId('field'), { target: { value: 'Γεια' } });
		expect(onInput).toHaveBeenLastCalledWith('Γεια');
		expect(screen.getByRole('alert')).toHaveTextContent('Πολύ μεγάλο κείμενο');
		expect(screen.getByText('Το βλέπει ο ασθενής.')).toBeInTheDocument();
	});

	it('(negative, U-65.6) what was written is shown back as text, never HTML', () => {
		render(NoteField, { props: { ...props, value: '<b>bold</b>' } });
		expect(screen.getByTestId('field')).toHaveValue('<b>bold</b>');
		expect(document.querySelector('b')).toBeNull();
	});
});
