import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Badge from './badge.svelte';

const badgeOf = (container: HTMLElement) =>
	container.querySelector('[data-slot="badge"]') as HTMLElement;

describe('Badge', () => {
	it('U-03.1: draws the label as a pill span with the primary tone by default', () => {
		const { container } = render(Badge, { props: { label: 'Νέο' } });
		const badge = badgeOf(container);
		expect(badge.tagName).toBe('SPAN');
		expect(badge).toHaveClass(
			'rounded-full',
			'border',
			'border-primary',
			'bg-primary',
			'px-2.5',
			'py-1'
		);
		expect(screen.getByText('Νέο')).toHaveClass(
			'text-label-md',
			'font-semibold',
			'text-primary-foreground'
		);
	});

	it('U-03.1: paints a status as a soft tint with its own *-text colour (S-32.16)', () => {
		const { container } = render(Badge, { props: { label: 'Ακυρώθηκε', tone: 'danger' } });
		expect(badgeOf(container)).toHaveClass('bg-danger/15', 'border-danger/20');
		expect(screen.getByText('Ακυρώθηκε')).toHaveClass('text-danger-text');
		expect(screen.getByText('Ακυρώθηκε').className).not.toMatch(/\btext-danger\b(?!-)/);
	});

	it('U-03.1: a warning is never a text colour: its words wear foreground', () => {
		render(Badge, { props: { label: 'Εκκρεμεί', tone: 'warning' } });
		expect(screen.getByText('Εκκρεμεί')).toHaveClass('text-foreground');
	});

	it('U-03.1: `solid` fills only the status tones (S-34.1) and is a no-op for the others', () => {
		const solid = render(Badge, { props: { label: 'OK', tone: 'success', solid: true } });
		expect(badgeOf(solid.container)).toHaveClass('bg-success-text');
		expect(screen.getByText('OK')).toHaveClass('text-success-foreground');
		solid.unmount();

		const plain = render(Badge, { props: { label: 'Π', tone: 'primary', solid: true } });
		expect(badgeOf(plain.container)).toHaveClass('bg-primary');
	});

	it('U-03.1: sizes sm and md change only the padding, never the text role', () => {
		const sm = render(Badge, { props: { label: 'A', size: 'sm' } });
		expect(badgeOf(sm.container)).toHaveClass('px-2', 'py-0.5');
		expect(screen.getByText('A')).toHaveClass('text-label-md');
	});
});
