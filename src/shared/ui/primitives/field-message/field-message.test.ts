import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import FieldMessage from './field-message.svelte';

describe('FieldMessage', () => {
	it('U-03.1: writes the error in danger-text with its alert glyph, announced politely (S-32.16)', () => {
		const { container } = render(FieldMessage, { props: { error: 'Υποχρεωτικό πεδίο', id: 'm1' } });
		const line = container.querySelector('[data-slot="field-message"]') as HTMLElement;
		expect(line).toHaveAttribute('id', 'm1');
		expect(line).toHaveAttribute('data-state', 'error');
		expect(line.querySelector('[data-icon="alert-circle"]')).toHaveClass(
			'icon-sm',
			'text-danger-text'
		);
		const words = screen.getByText('Υποχρεωτικό πεδίο');
		expect(words).toHaveClass('text-body-sm', 'text-danger-text');
		expect(words).toHaveAttribute('aria-live', 'polite');
	});

	it('U-03.1: without an error it is the muted helper, and nothing without either', () => {
		const helper = render(FieldMessage, { props: { helperText: 'Θα το δει μόνο ο γιατρός.' } });
		expect(screen.getByText('Θα το δει μόνο ο γιατρός.')).toHaveClass(
			'text-body-sm',
			'text-muted-foreground'
		);
		helper.unmount();
		const quiet = render(FieldMessage, { props: { error: 'Λάθος', icon: false } });
		expect(quiet.container.querySelector('[data-icon]')).toBeNull();
		quiet.unmount();
		const none = render(FieldMessage);
		expect(none.container.querySelector('[data-slot="field-message"]')).toBeNull();
	});
});
