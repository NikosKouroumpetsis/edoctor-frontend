import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ScoreChip from './score-chip.svelte';

describe('ScoreChip', () => {
	it('U-03.1: frames a glyph and «label value» like the review chips (M-17)', () => {
		const { container } = render(ScoreChip, {
			props: { icon: 'time-outline', label: 'Συνέπεια', value: '4,9' }
		});
		const chip = container.querySelector('[data-slot="score-chip"]') as HTMLElement;
		expect(chip).toHaveClass('rounded-md', 'border', 'border-border/70', 'px-3', 'py-2', 'gap-2');
		expect(chip.querySelector('[data-icon="time-outline"]')).toHaveClass(
			'icon-sm',
			'text-foreground'
		);
		expect(screen.getByText('Συνέπεια 4,9')).toHaveClass(
			'text-body-sm',
			'font-semibold',
			'text-muted-foreground'
		);
		expect(chip.tagName).toBe('SPAN');
	});
});
