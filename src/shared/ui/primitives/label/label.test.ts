import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import Label from './label.svelte';

describe('Label', () => {
	// R2-4 / 2δ: the application's `atoms/label` — its role and colour, `label` / `required` / `disabled`.
	it('2δ: draws the words in the application’s label role', () => {
		render(Label, { props: { label: 'Διεύθυνση email', for: 'email' } });
		const label = screen.getByText('Διεύθυνση email');
		expect(label.tagName).toBe('LABEL');
		expect(label).toHaveClass('text-label-lg', 'font-medium', 'text-foreground', 'gap-1');
		expect(label).toHaveAttribute('for', 'email');
		expect(label).not.toHaveClass('text-body-sm');
	});

	it('2δ: required adds the danger «*», read as «υποχρεωτικό»', () => {
		const { container } = render(Label, { props: { label: 'Υποχρεωτικό πεδίο', required: true } });
		const star = container.querySelector('[data-slot="label-required"]') as HTMLElement;
		expect(star).toHaveTextContent('*');
		expect(star).toHaveClass('text-danger-text');
		expect(star).toHaveAttribute('aria-hidden', 'true');
		expect(screen.getByText('υποχρεωτικό')).toHaveClass('sr-only');
	});

	it('2δ: disabled dims it; without `required` there is no star', () => {
		const { container } = render(Label, { props: { label: 'Ανενεργό πεδίο', disabled: true } });
		expect(screen.getByText('Ανενεργό πεδίο')).toHaveClass('opacity-50');
		expect(container.querySelector('[data-slot="label-required"]')).toBeNull();
	});

	it('keeps children for a composed label (the web’s idiom)', () => {
		render(Label, {
			props: { children: createRawSnippet(() => ({ render: () => '<span>Παιδί</span>' })) }
		});
		expect(screen.getByText('Παιδί').closest('label')).toHaveAttribute('data-slot', 'label');
	});
});
