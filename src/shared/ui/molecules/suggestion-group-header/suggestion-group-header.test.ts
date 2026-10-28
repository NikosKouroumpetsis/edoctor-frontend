import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import SuggestionGroupHeader from './suggestion-group-header.svelte';

describe('SuggestionGroupHeader', () => {
	it('U-03.1 (K4.4, M-36): the muted 16 glyph and the 14 semibold words, 8 apart, inset 4', () => {
		const { container } = render(SuggestionGroupHeader, {
			props: { label: 'Ειδικότητες', icon: 'medkit-outline', id: 'group-specialties' }
		});
		const header = container.querySelector('[data-slot="suggestion-group-header"]') as HTMLElement;
		expect(header).toHaveClass('flex', 'flex-row', 'items-center', 'gap-2', 'px-1');
		expect(header).toHaveAttribute('id', 'group-specialties');
		expect(header.querySelector('[data-icon="medkit-outline"]')).toHaveClass(
			'icon-sm',
			'text-muted-foreground'
		);
		expect(screen.getByText('Ειδικότητες')).toHaveClass(
			'text-body-sm',
			'font-semibold',
			'text-foreground'
		);
	});

	it('U-03.1 (K4.4): without a glyph it is the «recommended» header — the words alone, no row, no inset', () => {
		const { container } = render(SuggestionGroupHeader, {
			props: { label: 'Προτεινόμενες ειδικότητες' }
		});
		const header = container.querySelector('[data-slot="suggestion-group-header"]') as HTMLElement;
		expect(header).not.toHaveClass('flex', 'px-1');
		expect(header.querySelector('[data-slot="ionicon"]')).toBeNull();
		expect(screen.getByText('Προτεινόμενες ειδικότητες')).toHaveClass(
			'text-body-sm',
			'font-semibold',
			'text-foreground'
		);
	});

	it('U-03.1 (a11y, light/dark): the glyph is decorative, the colours are theme tokens', () => {
		const { container } = render(SuggestionGroupHeader, {
			props: { label: 'Γιατροί', icon: 'person-outline' }
		});
		expect(container.querySelector('[data-icon="person-outline"]')).toHaveAttribute(
			'aria-hidden',
			'true'
		);
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b/i);
	});
});
