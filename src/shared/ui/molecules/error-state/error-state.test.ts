import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'svelte';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import ErrorState from './error-state.svelte';

const sorted = (element: Element) => [...element.classList].sort();
const COLUMN = ['flex', 'w-full', 'flex-col', 'items-center', 'gap-4', 'px-6', 'py-section'].sort();

function renderError(props: Partial<ComponentProps<typeof ErrorState>> = {}) {
	const onActionPress = vi.fn();
	const view = render(ErrorState, {
		props: {
			title: 'Δεν φόρτωσε',
			description: 'Ελέγξτε τη σύνδεσή σας.',
			actionLabel: 'Δοκιμάστε ξανά',
			onActionPress,
			testId: 'surface-error',
			...props
		}
	});
	return { onActionPress, ...view };
}

describe('ErrorState', () => {
	it('U-03.1 (K6.1): states what happened and offers the ONE action that can change it, the caller’s retry', async () => {
		const { onActionPress } = renderError();
		expect(screen.getByText('Δεν φόρτωσε')).toBeInTheDocument();
		expect(screen.getByText('Ελέγξτε τη σύνδεσή σας.')).toBeInTheDocument();
		const retry = screen.getByRole('button', { name: 'Δοκιμάστε ξανά' });
		expect(screen.getAllByRole('button')).toHaveLength(1);
		await userEvent.click(retry);
		expect(onActionPress).toHaveBeenCalledTimes(1);
	});

	it('S-32.3: the retry is the sentence-case outlined button', () => {
		renderError();
		const retry = screen.getByRole('button', { name: 'Δοκιμάστε ξανά' });
		expect(retry).toHaveAttribute('data-tone', 'outline');
		expect(retry).toHaveClass('border-foreground', 'bg-transparent', 'rounded-md');
		expect(screen.getByText('Δοκιμάστε ξανά')).toHaveClass('normal-case', 'text-body-md');
	});

	it('U-02.2: plain pads the empty state in its own column, the testId on the empty state', () => {
		renderError();
		const state = screen.getByTestId('surface-error');
		expect(sorted(state)).toEqual(COLUMN);
		const pad = state.parentElement as HTMLElement;
		expect(pad).toHaveAttribute('data-slot', 'error-state');
		expect(sorted(pad)).toEqual(['flex', 'flex-col', 'items-center', 'py-6'].sort());
	});

	it('U-02.2 (M-40): framed is the empty state’s card alone — the testId on the card, no column around it', () => {
		const { container } = renderError({ variant: 'framed', testId: 'list-error' });
		const card = screen.getByTestId('list-error');
		expect(card).toHaveAttribute('data-slot', 'empty-state-card');
		expect(sorted(card)).toEqual(
			[
				'flex',
				'flex-col',
				'rounded-xl',
				'border',
				'border-border/70',
				'bg-card/95',
				'p-2',
				'shadow-soft'
			].sort()
		);
		expect(container.querySelector('[data-slot="error-state"]')).toBeNull();
		expect(container.firstElementChild).toBe(card);
	});

	it('U-03.1: the testId is the caller’s; the page may name the title’s level', () => {
		renderError({ testId: 'doctor-appointments-list-error', titleAs: 'h2' });
		expect(screen.getByTestId('doctor-appointments-list-error')).toBeInTheDocument();
		expect(screen.getByRole('heading', { level: 2, name: 'Δεν φόρτωσε' })).toBeInTheDocument();
	});

	it('U-03.1 (negative): a retry needs its words and its press, and the words of what happened', () => {
		// @ts-expect-error an error state without its one action
		const props: ComponentProps<typeof ErrorState> = { title: 'α', description: 'β' };
		expect(props.title).toBe('α');
	});

	it('U-03.1 (zones, light/dark): the same at every width, only theme tokens', () => {
		for (const variant of ['plain', 'framed'] as const) {
			const { container, unmount } = renderError({ variant });
			expect(container.innerHTML).not.toMatch(/\b(tablet|split|laptop|desktop|wide):/);
			expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
			unmount();
		}
	});
});
