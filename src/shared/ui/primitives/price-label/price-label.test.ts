import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import PriceLabel from './price-label.svelte';
import { priceLabelLooks, type PriceLabelKind, type PriceLabelPlacement } from './index';

/** M-06, the application's twelve looks, class for class (`search-doctor-card`, `sticky-booking-bar`, `priced-service-card`). */
const TWELVE: Record<PriceLabelPlacement, Record<PriceLabelKind, string[]>> = {
	card: {
		amount: ['text-body-sm', 'text-muted-foreground'],
		action: ['text-label-md', 'font-semibold', 'text-foreground', 'underline'],
		note: ['text-body-sm', 'text-muted-foreground']
	},
	'card-list': {
		amount: ['text-body-lg', 'text-foreground'],
		action: ['text-label-md', 'font-semibold', 'text-foreground', 'underline'],
		note: ['text-body-lg', 'text-muted-foreground']
	},
	bar: {
		amount: ['text-title-sm', 'font-semibold', 'text-foreground', 'line-clamp-1'],
		action: ['text-body-md', 'font-semibold', 'text-foreground', 'underline', 'line-clamp-2'],
		note: ['text-body-md', 'font-semibold', 'text-foreground', 'line-clamp-2']
	},
	offer: {
		amount: ['text-right', 'text-title-sm', 'font-semibold', 'text-foreground', 'line-clamp-2'],
		action: [
			'text-right',
			'text-body-sm',
			'font-semibold',
			'text-foreground',
			'underline',
			'line-clamp-2'
		],
		note: ['text-right', 'text-body-sm', 'font-semibold', 'text-foreground', 'line-clamp-2']
	}
};

describe('PriceLabel', () => {
	it('U-02.2, U-03.1 (K3.5): the twelve looks of M-06, three kinds in four places, class for class', () => {
		for (const placement of Object.keys(TWELVE) as PriceLabelPlacement[]) {
			for (const kind of Object.keys(TWELVE[placement]) as PriceLabelKind[]) {
				const view =
					kind === 'action'
						? render(PriceLabel, { props: { kind, placement, label: 'Λ', onAction: () => {} } })
						: render(PriceLabel, { props: { kind, placement, label: 'Λ' } });
				const words = view.getByText('Λ');
				expect(words, `${placement} ${kind}`).toHaveClass(...TWELVE[placement][kind]);
				view.unmount();
			}
		}
		expect(Object.values(priceLabelLooks).flatMap((place) => Object.keys(place))).toHaveLength(12);
	});

	it('S-31.4: the action is its own 48 button named by its words, and pressing it calls `onAction`', async () => {
		const user = userEvent.setup({ delay: null });
		const onAction = vi.fn();
		render(PriceLabel, {
			props: { kind: 'action', placement: 'card', label: 'Συνδεθείτε για κόστος', onAction }
		});
		const action = screen.getByRole('button', { name: 'Συνδεθείτε για κόστος' });
		expect(action).toHaveClass('min-h-touch', 'min-w-touch', 'inline-flex', 'items-center');
		await user.click(action);
		expect(onAction).toHaveBeenCalledOnce();
	});

	it('S-31.4: with an `href` the action is a link to the sign-in page, in its 48 box; the offer’s sits at the end', () => {
		render(PriceLabel, {
			props: { kind: 'action', placement: 'offer', label: 'Συνδεθείτε για κόστος', href: '/login' }
		});
		const link = screen.getByRole('link', { name: 'Συνδεθείτε για κόστος' });
		expect(link).toHaveAttribute('href', '/login');
		expect(link).toHaveClass('min-h-touch', 'min-w-touch', 'justify-end');
	});

	it('U-03.1 (K3.5, negative): an amount or a note is words, never a control', () => {
		render(PriceLabel, { props: { kind: 'amount', placement: 'card-list', label: 'Από 40 €' } });
		render(PriceLabel, {
			props: { kind: 'note', placement: 'bar', label: 'Επικοινωνία για κόστος' }
		});
		expect(screen.queryByRole('button')).toBeNull();
		expect(screen.queryByRole('link')).toBeNull();
		expect(screen.getByText('Από 40 €').tagName).toBe('P');
	});

	it('U-02.1 (S-31.2 at the caller): the words pass through untouched («Από 40 €» · «From €40»)', () => {
		render(PriceLabel, { props: { kind: 'amount', placement: 'card', label: 'From €40' } });
		render(PriceLabel, { props: { kind: 'amount', placement: 'card', label: 'Από 40 €' } });
		expect(screen.getByText('From €40')).toBeInTheDocument();
		expect(screen.getByText('Από 40 €')).toBeInTheDocument();
	});
});
