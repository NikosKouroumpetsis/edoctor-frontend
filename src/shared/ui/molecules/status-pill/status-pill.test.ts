import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import StatusPill from './status-pill.svelte';

describe('StatusPill (D-W51-27: the one pill of a state, shared)', () => {
	it('the words as a text node, in the tone’s tint — warm, green, neutral (no hex, no HTML)', () => {
		const tones = { warning: 'bg-warning/10', success: 'bg-success/10', muted: 'bg-chip' } as const;
		for (const [tone, tint] of Object.entries(tones)) {
			const view = render(StatusPill, {
				props: {
					pill: { label: '<b>Αίτημα</b>', tone: tone as keyof typeof tones },
					testId: 'pill'
				}
			});
			const pill = screen.getByTestId('pill');
			expect(pill).toHaveAttribute('data-tone', tone);
			expect(pill.className).toContain(tint);
			expect(pill.className).toContain('rounded-full');
			expect(pill.querySelector('b')).toBeNull();
			expect(pill).toHaveTextContent('<b>Αίτημα</b>');
			view.unmount();
		}
	});
});
