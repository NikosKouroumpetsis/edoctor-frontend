import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import ActionOffer from './action-offer.svelte';

const props = {
	title: 'Θέλετε απλώς άλλη ώρα;',
	body: 'Αλλάξτε την ώρα και το ραντεβού μένει.',
	action: 'Αλλαγή ώρας',
	href: '/x/time',
	testId: 'offer',
	actionTestId: 'offer-time'
};

describe('ActionOffer (the 53’s «Θέλετε απλώς άλλη ώρα;»; shared since D-W51-51)', () => {
	it('the words on the left, the action an outlined link on the right, framed', () => {
		render(ActionOffer, { props: { ...props, onOpen: () => {} } });
		const offer = screen.getByTestId('offer');
		expect(offer).toHaveAttribute('data-slot', 'action-offer');
		expect(offer).toHaveTextContent('Θέλετε απλώς άλλη ώρα;');
		expect(offer).toHaveTextContent('Αλλάξτε την ώρα και το ραντεβού μένει.');
		const link = screen.getByTestId('offer-time');
		expect(link).toHaveAttribute('href', '/x/time');
		expect(link).toHaveTextContent('Αλλαγή ώρας');
	});

	it('🔴 U-102: a press goes through the caller (it opens the screen as one more step)', async () => {
		const onOpen = vi.fn((event: MouseEvent) => event.preventDefault());
		render(ActionOffer, { props: { ...props, onOpen } });
		await userEvent.click(screen.getByTestId('offer-time'));
		expect(onOpen).toHaveBeenCalledTimes(1);
	});

	it('(negative) U-65.6: the words are text, never HTML', () => {
		render(ActionOffer, { props: { ...props, title: '<b>x</b>', onOpen: () => {} } });
		expect(screen.getByTestId('offer').querySelector('b')).toBeNull();
	});
});
