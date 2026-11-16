import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import StatusHeading from './status-heading.svelte';

const props = {
	pill: { label: 'Επιβεβαιωμένο', tone: 'success' as const },
	day: 'Δευτέρα 16 Νοεμβρίου',
	time: '11:00',
	separator: ' · ',
	pillTestId: 'pill',
	titleTestId: 'title',
	subTestId: 'sub'
};

describe('StatusHeading (D-W51-37: the 51’s and the 68’s head, shared)', () => {
	it('the pill, the day and the time as one heading (the separator from 744), how near and how long', () => {
		render(StatusHeading, { props: { ...props, sub: 'Σε 2 ημέρες · Διάρκεια 20 λεπτά' } });
		expect(screen.getByTestId('pill')).toHaveTextContent('Επιβεβαιωμένο');
		const title = screen.getByRole('heading', { level: 2 });
		expect(title).toHaveAttribute('data-testid', 'title');
		expect(title).toHaveTextContent('Δευτέρα 16 Νοεμβρίου · 11:00');
		expect(title.querySelector('.hidden.tablet\\:inline')).toHaveTextContent('·');
		expect(screen.getByTestId('sub')).toHaveTextContent('Σε 2 ημέρες · Διάρκεια 20 λεπτά');
	});

	it('no line under it without one; (negative, U-65.6) words are text, never HTML', () => {
		render(StatusHeading, { props: { ...props, day: '<b>x</b>' } });
		expect(screen.queryByTestId('sub')).toBeNull();
		expect(screen.getByRole('heading').querySelector('b')).toBeNull();
	});
});
