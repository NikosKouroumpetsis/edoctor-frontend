import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import StatusPill from './index.svelte';

describe('ui/status-pill (record §6.1, P-W4 Σ-27, D-W4-15)', () => {
	it('record §6.1: waiting warm, kept green, everything settled neutral — the theme’s tones, never a colour of its own', () => {
		const tones = {
			warning: ['border-warning/40', 'bg-warning/10', 'text-foreground'],
			success: ['border-success/40', 'bg-success/10', 'text-success-text'],
			muted: ['border-line-2', 'bg-chip', 'text-foreground']
		} as const;
		for (const [tone, classes] of Object.entries(tones)) {
			const view = render(StatusPill, {
				props: { pill: { label: tone, tone: tone as keyof typeof tones } }
			});
			const pill = screen.getByText(tone);
			expect(pill).toHaveAttribute('data-tone', tone);
			expect(pill).toHaveClass('min-h-6', 'rounded-full', 'border', 'text-label-md', ...classes);
			expect(pill.className).not.toMatch(/#|rgb|hover:/u);
			view.unmount();
		}
	});
});
