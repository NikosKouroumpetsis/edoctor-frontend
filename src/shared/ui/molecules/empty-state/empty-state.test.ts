import { describe, expect, it, vi } from 'vitest';
import { createRawSnippet } from 'svelte';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import EmptyState from './empty-state.svelte';
import type { EmptyStateProps } from './index';

const sorted = (element: Element) => [...element.classList].sort();
const icon = createRawSnippet(() => ({ render: () => '<span data-testid="icon">◎</span>' }));

describe('EmptyState', () => {
	it('U-03.1 (K6.1): the title over its line, the title a paragraph unless the page names its level', () => {
		const view = render(EmptyState, {
			props: { title: 'Δεν υπάρχουν ραντεβού', description: 'Κλείστε το πρώτο σας.' }
		});
		expect(screen.getByText('Δεν υπάρχουν ραντεβού').tagName).toBe('P');
		expect(screen.getByText('Κλείστε το πρώτο σας.')).toBeInTheDocument();
		expect(screen.queryByRole('heading')).toBeNull();
		view.unmount();
		render(EmptyState, { props: { title: 'Η σελίδα δεν βρέθηκε', titleAs: 'h1' } });
		expect(screen.getByRole('heading', { level: 1, name: 'Η σελίδα δεν βρέθηκε' })).toHaveClass(
			'text-center',
			'text-title-sm',
			'font-semibold',
			'text-foreground'
		);
	});

	it('U-03.1: the icon snippet sits above the words, centred', () => {
		render(EmptyState, { props: { title: 'Κενό', icon } });
		const wrapper = screen.getByTestId('icon').parentElement as HTMLElement;
		expect(sorted(wrapper)).toEqual(['flex', 'flex-col', 'items-center', 'justify-center']);
		expect(wrapper.nextElementSibling).toContainElement(screen.getByText('Κενό'));
	});

	it('U-03.1 (negative): no button without both the words and a press or a link', () => {
		// @ts-expect-error words without a press or a link
		const words: EmptyStateProps = { title: 'α', actionLabel: 'β' };
		// @ts-expect-error a press without its words
		const press: EmptyStateProps = { title: 'α', onActionPress: () => {} };
		for (const props of [words, press]) {
			const view = render(EmptyState, { props });
			expect(screen.queryByRole('button')).toBeNull();
			expect(screen.queryByRole('link')).toBeNull();
			view.unmount();
		}
	});

	it('U-03.1 (K6.1): the action is the caller’s, pressed once per press', async () => {
		const onActionPress = vi.fn();
		render(EmptyState, {
			props: { title: 'Κενό', actionLabel: 'Κλείσε ραντεβού', onActionPress }
		});
		await userEvent.click(screen.getByRole('button', { name: 'Κλείσε ραντεβού' }));
		expect(onActionPress).toHaveBeenCalledTimes(1);
	});

	it('S-32.3: draws its action as the sentence-case outlined button, never a blue one in capitals', () => {
		render(EmptyState, {
			props: {
				title: 'Καμία ακριβής αντιστοιχία',
				actionLabel: 'Οποτεδήποτε',
				onActionPress: vi.fn()
			}
		});
		const button = screen.getByRole('button', { name: 'Οποτεδήποτε' });
		expect(button).toHaveAttribute('data-tone', 'outline');
		expect(button).toHaveClass('border', 'border-foreground', 'bg-transparent', 'rounded-md');
		expect(button).not.toHaveClass('bg-primary');
		const label = screen.getByText('Οποτεδήποτε');
		expect(label).toHaveClass('normal-case', 'text-foreground', 'text-body-md', 'font-semibold');
		expect(label).not.toHaveClass('uppercase');
		expect(label).toHaveTextContent(/^Οποτεδήποτε$/);
	});

	it('U-03.1 (web): a link instead of a press is the outlined button as an anchor (an error page’s way home)', () => {
		render(EmptyState, { props: { title: 'Δεν βρέθηκε', actionLabel: 'Αρχική', actionHref: '/' } });
		const link = screen.getByRole('link', { name: 'Αρχική' });
		expect(link).toHaveAttribute('href', '/');
		expect(link).toHaveClass('border-foreground', 'bg-transparent', 'rounded-md');
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('U-02.2 (M-40): framed sets the same column in the application’s card with the 8 inset, the card named by the testId', async () => {
		const onActionPress = vi.fn();
		const { container } = render(EmptyState, {
			props: {
				title: 'Τίποτα εδώ',
				description: 'Δοκιμάστε λιγότερα φίλτρα.',
				actionLabel: 'Καθαρισμός',
				onActionPress,
				testId: 'list-empty',
				variant: 'framed'
			}
		});
		const card = screen.getByTestId('list-empty');
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
		expect(card).toHaveAttribute('data-slot', 'empty-state-card');
		expect(card.children).toHaveLength(1);
		expect(sorted(card.children[0])).toEqual(
			['flex', 'w-full', 'flex-col', 'items-center', 'gap-4', 'px-6', 'py-section'].sort()
		);
		expect(container.querySelectorAll('[data-testid]')).toHaveLength(1);
		await userEvent.click(within(card).getByRole('button', { name: 'Καθαρισμός' }));
		expect(onActionPress).toHaveBeenCalledTimes(1);
	});

	it('U-02.2: plain prints the testId on the column itself, class for class with the application', () => {
		render(EmptyState, {
			props: { title: 'Κενό', description: 'Γραμμή', testId: 'surface-empty' }
		});
		const column = screen.getByTestId('surface-empty');
		expect(sorted(column)).toEqual(
			['flex', 'w-full', 'flex-col', 'items-center', 'gap-4', 'px-6', 'py-section'].sort()
		);
		expect(sorted(screen.getByText('Κενό').parentElement as HTMLElement)).toEqual(
			['flex', 'flex-col', 'items-center', 'gap-2'].sort()
		);
		expect(sorted(screen.getByText('Κενό'))).toEqual(
			['text-center', 'text-title-sm', 'font-semibold', 'text-foreground'].sort()
		);
		expect(sorted(screen.getByText('Γραμμή'))).toEqual(
			['max-w-narrow', 'text-center', 'text-body-md', 'text-muted-foreground'].sort()
		);
	});

	it('U-03.1 (zones, light/dark): the same at every width, only theme tokens, the caller’s class on the column', () => {
		const { container } = render(EmptyState, {
			props: {
				title: 'Κενό',
				actionLabel: 'Δράση',
				onActionPress: vi.fn(),
				variant: 'framed',
				class: 'py-6'
			}
		});
		const column = container.querySelector('[data-slot="empty-state"]') as HTMLElement;
		expect(column).toHaveClass('py-6');
		expect(column).not.toHaveClass('py-section');
		expect(container.innerHTML).not.toMatch(/\b(tablet|split|laptop|desktop|wide):/);
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});
});
