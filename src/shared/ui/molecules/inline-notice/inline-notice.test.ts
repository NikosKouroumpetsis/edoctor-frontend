import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'svelte';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import InlineNotice from './inline-notice.svelte';

const sorted = (element: Element) => [...element.classList].sort();
const classes = (list: string) => list.split(' ').sort();

describe('InlineNotice', () => {
	it('U-03.1 (K6.2): prints the message, and its action only with both the words and a press', () => {
		// @ts-expect-error words without a press
		const words: ComponentProps<typeof InlineNotice> = { message: 'α', actionLabel: 'β' };
		// @ts-expect-error a press without its words
		const press: ComponentProps<typeof InlineNotice> = { message: 'α', onAction: () => {} };
		for (const props of [words, press]) {
			const view = render(InlineNotice, { props });
			expect(screen.getByText('α')).toBeInTheDocument();
			expect(screen.queryByRole('button')).toBeNull();
			view.unmount();
		}
	});

	it('U-03.1: the action is called once per press, through a button named by its words, both parts named by the caller’s ids', async () => {
		const onAction = vi.fn();
		render(InlineNotice, {
			props: {
				message: 'Δεν φόρτωσε.',
				actionLabel: 'Ξανά',
				onAction,
				testId: 'notice',
				actionTestId: 'notice-retry'
			}
		});
		await userEvent.click(screen.getByRole('button', { name: 'Ξανά' }));
		expect(onAction).toHaveBeenCalledTimes(1);
		expect(screen.getByTestId('notice')).toBeInTheDocument();
		expect(screen.getByTestId('notice-retry').tagName).toBe('BUTTON');
	});

	it('U-03.1 (negative): prints no id the caller did not give', () => {
		const { container } = render(InlineNotice, {
			props: { message: 'Δεν φόρτωσε.', actionLabel: 'Ξανά', onAction: vi.fn() }
		});
		expect(container.querySelectorAll('[data-testid]')).toHaveLength(0);
	});

	it.each([
		['muted', false, 'rounded-md bg-muted px-3 py-3', 'text-label-md text-muted-foreground', null],
		[
			'muted',
			true,
			'gap-2 rounded-md bg-muted px-3 py-3',
			'text-label-md text-muted-foreground',
			'text-label-md text-foreground font-semibold underline'
		],
		[
			'tint',
			false,
			'rounded-md bg-foreground/6 px-3 py-2.5',
			'text-label-lg text-foreground',
			null
		],
		[
			'tint',
			true,
			'gap-2 rounded-md bg-foreground/6 px-3 py-2.5',
			'text-label-lg text-foreground',
			'text-label-lg text-foreground font-semibold underline'
		],
		['danger', false, 'gap-1.5 px-1', 'text-label-md text-danger-text', null],
		[
			'danger',
			true,
			'gap-1.5 px-1',
			'text-label-md text-danger-text',
			'text-label-md text-danger-text font-semibold'
		]
	] as const)(
		'U-02.2 (D7, M-27): draws the %s box (action %s) as the criteria and the profile did, class for class',
		(variant, withAction, box, text, action) => {
			render(InlineNotice, {
				props: withAction
					? {
							message: 'Δεν φόρτωσε.',
							variant,
							actionLabel: 'Ξανά',
							onAction: vi.fn(),
							testId: 'notice',
							actionTestId: 'notice-action'
						}
					: { message: 'Δεν φόρτωσε.', variant, testId: 'notice', actionTestId: 'notice-action' }
			});
			expect(sorted(screen.getByTestId('notice'))).toEqual(classes(`flex flex-col ${box}`));
			expect(sorted(screen.getByText('Δεν φόρτωσε.'))).toEqual(classes(text));
			if (action) {
				const target = screen.getByTestId('notice-action');
				// The application's `min-h-touch min-w-touch justify-center self-start`, as the kit's text button.
				expect(target).toHaveClass(
					'inline-flex',
					'min-h-touch',
					'min-w-touch',
					'items-center',
					'self-start'
				);
				expect(sorted(screen.getByText('Ξανά'))).toEqual(classes(action));
			} else {
				expect(screen.queryByTestId('notice-action')).toBeNull();
			}
		}
	);

	it('U-03.1: muted unless told otherwise', () => {
		render(InlineNotice, { props: { message: 'Τίποτα.', testId: 'notice' } });
		expect(screen.getByTestId('notice')).toHaveAttribute('data-variant', 'muted');
		expect(screen.getByTestId('notice')).toHaveClass('bg-muted', 'px-3', 'py-3');
	});

	it('U-03.1 (a11y): an empty or failed list is a polite status, a refusal an alert, a note no live region; the caller’s role wins', () => {
		const roleOf = (props: ComponentProps<typeof InlineNotice>) => {
			const view = render(InlineNotice, { props: { ...props, testId: 'notice' } });
			const role = screen.getByTestId('notice').getAttribute('role');
			view.unmount();
			return role;
		};
		expect(roleOf({ message: 'α' })).toBe('status');
		expect(roleOf({ message: 'α', variant: 'danger' })).toBe('alert');
		expect(roleOf({ message: 'α', variant: 'tint' })).toBeNull();
		expect(roleOf({ message: 'α', variant: 'tint', role: 'status' })).toBe('status');
		expect(roleOf({ message: 'α', variant: 'muted', role: null })).toBeNull();
		render(InlineNotice, { props: { message: 'Η αναζήτηση δεν ολοκληρώθηκε.' } });
		expect(screen.getByRole('status')).toHaveTextContent('Η αναζήτηση δεν ολοκληρώθηκε.');
	});

	it('U-03.1 (zones, light/dark): the same at every width, only theme tokens, status read as text in *-text', () => {
		for (const variant of ['muted', 'tint', 'danger'] as const) {
			const { container, unmount } = render(InlineNotice, {
				props: { message: 'α', variant, actionLabel: 'β', onAction: vi.fn() }
			});
			expect(container.innerHTML).not.toMatch(/\b(tablet|split|laptop|desktop|wide):/);
			expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
			expect(container.innerHTML).not.toMatch(/\btext-danger(?!-text)\b/);
			unmount();
		}
	});
});
