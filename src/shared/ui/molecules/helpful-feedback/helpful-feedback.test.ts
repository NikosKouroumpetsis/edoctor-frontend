import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { HelpfulFeedback } from '.';

const props = {
	value: null,
	question: 'Ήταν χρήσιμο;',
	thanks: 'Ευχαριστούμε για την απάντηση',
	undone: 'Η απάντηση αναιρέθηκε',
	upLabel: 'Ναι, ήταν χρήσιμο',
	downLabel: 'Όχι, δεν ήταν χρήσιμο',
	reasonsTitle: 'Τι δεν πήγε καλά; (προαιρετικό)',
	reasons: [
		{ id: 'unclear', label: 'Δύσκολο στην κατανόηση' },
		{ id: 'outdated', label: 'Λάθος ή παλιά πληροφορία' }
	],
	onVote: () => {}
} as const;

const up = () => screen.getByRole('button', { name: 'Ναι, ήταν χρήσιμο' });
const down = () => screen.getByRole('button', { name: 'Όχι, δεν ήταν χρήσιμο' });

afterEach(cleanup);

describe('molecules::HelpfulFeedback (U-78)', () => {
	it('names its group with the question, and presses nothing before an answer', () => {
		render(HelpfulFeedback, { props });
		const group = screen.getByRole('group', { name: 'Ήταν χρήσιμο;' });
		expect(within(group).getByText('Ευχαριστούμε για την απάντηση')).toHaveAttribute(
			'aria-hidden',
			'true'
		);
		expect(up()).toHaveAttribute('aria-pressed', 'false');
		expect(down()).toHaveAttribute('aria-pressed', 'false');
	});

	it('Π2: `md` is the 48 tile with a 24 glyph, `sm` the outlined circle with a 20 one', () => {
		const { unmount } = render(HelpfulFeedback, { props });
		expect(up()).toHaveAttribute('data-appearance', 'tile');
		expect(up().querySelector('[class*="icon-lg"]')).not.toBeNull();
		unmount();
		render(HelpfulFeedback, { props: { ...props, size: 'sm' } });
		expect(up()).toHaveAttribute('data-appearance', 'outline');
		expect(up().querySelector('[class*="icon-md"]')).not.toBeNull();
	});

	it('Π2: an answer presses its thumb and changes the words; the ring moves nothing (inset)', () => {
		render(HelpfulFeedback, { props: { ...props, value: 'up' } });
		expect(up()).toHaveAttribute('aria-pressed', 'true');
		expect(up()).toHaveClass('ring-1', 'ring-inset', 'ring-foreground');
		expect(down()).toHaveAttribute('aria-pressed', 'false');
		expect(screen.getByText('Ήταν χρήσιμο;')).toHaveAttribute('aria-hidden', 'true');
		expect(screen.getByText('Ευχαριστούμε για την απάντηση')).toHaveAttribute(
			'aria-hidden',
			'false'
		);
	});

	it('U-12: the press that chooses plays the jump, CSS only; the page that opens answered does not', async () => {
		const user = userEvent.setup({ delay: null });
		const onVote = vi.fn();
		render(HelpfulFeedback, { props: { ...props, onVote } });
		const glyph = () => down().querySelector('[data-slot="helpful-feedback-glyph"]');
		expect(glyph()).not.toHaveClass('animate-thumb-down-pop');
		await user.click(down());
		expect(onVote).toHaveBeenCalledWith('down');
		expect(glyph()).toHaveClass('animate-thumb-down-pop');
	});

	it('U-78.1 Ε1: the reasons open only after «down», and one press chooses', async () => {
		const user = userEvent.setup({ delay: null });
		const onReason = vi.fn();
		const { rerender } = render(HelpfulFeedback, { props: { ...props, onReason } });
		const reasons = () => document.querySelector('[data-slot="helpful-feedback-reasons"]');
		expect(reasons()).toHaveAttribute('data-state', 'closed');
		await rerender({ ...props, onReason, value: 'up' });
		expect(reasons()).toHaveAttribute('data-state', 'closed');
		await rerender({ ...props, onReason, value: 'down', reason: 'unclear' });
		expect(reasons()).toHaveAttribute('data-state', 'open');
		const chosen = screen.getByRole('button', { name: 'Δύσκολο στην κατανόηση' });
		expect(chosen).toHaveAttribute('aria-pressed', 'true');
		await user.click(screen.getByRole('button', { name: 'Λάθος ή παλιά πληροφορία' }));
		expect(onReason).toHaveBeenCalledWith('outdated');
	});

	it('U-65.6: no field anywhere: a reason is a press on a closed list, never free text', () => {
		render(HelpfulFeedback, { props: { ...props, value: 'down' } });
		expect(document.querySelector('input, textarea, [contenteditable]')).toBeNull();
	});

	it('(negative) a failure is one line and says it aloud', () => {
		const failedMessage = 'Η απάντηση δεν καταγράφηκε. Δοκιμάστε ξανά.';
		render(HelpfulFeedback, { props: { ...props, failedMessage } });
		expect(screen.getByRole('alert')).toHaveTextContent(failedMessage);
	});
});
