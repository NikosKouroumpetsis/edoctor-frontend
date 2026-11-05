import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Timeline from './timeline.svelte';

const items = [
	{
		id: 'a',
		when: '2016 – σήμερα',
		whenLabel: '2016 έως σήμερα',
		title: 'Νοσοκομείο',
		detail: 'Αθήνα'
	},
	{ id: 'b', when: '2014 – 2016', title: 'Ειδικότητα' },
	{ id: 'c', when: '2013', title: 'Πτυχίο' },
	{ id: 'd', title: 'Χωρίς χρονιά' }
];
const base = {
	icon: 'school-outline' as const,
	title: 'Σπουδές',
	items,
	moreLabel: 'Εμφάνιση όλων (4)',
	fewerLabel: 'Εμφάνιση λιγότερων',
	testId: 'group'
};

describe('Timeline (U-73.1 Ε2)', () => {
	it('three entries, the rest closed and out of reach until the press, which opens them in place', async () => {
		render(Timeline, { props: base });
		const toggle = screen.getByTestId('group-toggle');
		expect(toggle).toHaveTextContent('Εμφάνιση όλων (4)');
		expect(toggle).toHaveAttribute('aria-expanded', 'false');
		expect(screen.getByTestId('group-more').inert).toBe(true);
		await userEvent.setup({ delay: null }).click(toggle);
		expect(toggle).toHaveTextContent('Εμφάνιση λιγότερων');
		expect(toggle).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getByTestId('group-more').inert).toBe(false);
	});

	it('three or fewer: no press at all', () => {
		render(Timeline, { props: { ...base, items: items.slice(0, 3) } });
		expect(screen.queryByTestId('group-toggle')).toBeNull();
		expect(screen.queryByTestId('group-more')).toBeNull();
	});

	it('the years are said in words; an entry without a year is the words alone', () => {
		render(Timeline, { props: base });
		const first = within(screen.getByTestId('group-item-a'));
		expect(first.getByLabelText('2016 έως σήμερα')).toHaveTextContent('2016 – σήμερα');
		expect(first.getByText('Αθήνα')).toBeInTheDocument();
		const plain = screen.getByTestId('group-item-d');
		expect(plain).toHaveTextContent('Χωρίς χρονιά');
		expect(plain.querySelector('[aria-label]')).toBeNull();
	});

	it('🔴 U-65.6: an entry’s words are text, never markup', () => {
		render(Timeline, {
			props: {
				...base,
				items: [{ id: 'x', title: '<img src=x onerror=alert(1)>', detail: '<b>Φ</b>' }]
			}
		});
		const entry = screen.getByTestId('group-item-x');
		expect(entry.querySelector('img')).toBeNull();
		expect(entry.querySelector('b')).toBeNull();
		expect(entry).toHaveTextContent('<img src=x onerror=alert(1)>');
	});
});
