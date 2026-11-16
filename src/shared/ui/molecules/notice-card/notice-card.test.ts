import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import NoticeCard from './notice-card.svelte';

describe('NoticeCard', () => {
	it('the sentence, then each line as its own text, in the tone’s tint (no hex, no HTML)', () => {
		render(NoticeCard, {
			props: {
				title: 'Η άδειά σας λήγει',
				lines: ['πρώτη', '<b>δεύτερη</b>'],
				tone: 'warm',
				testId: 'notice'
			}
		});
		const box = screen.getByTestId('notice');
		expect(box).toHaveAttribute('data-tone', 'warm');
		expect(box.className).toContain('bg-warning/10');
		expect(box.querySelector('b')).toBeNull();
		expect(screen.getByText('<b>δεύτερη</b>')).toBeInTheDocument();
		expect([...box.querySelectorAll('p')].map((p) => p.textContent)).toEqual([
			'Η άδειά σας λήγει',
			'πρώτη',
			'<b>δεύτερη</b>'
		]);
	});

	it('D-W51-47: a last line of the caller’s own (words with a number to call) under the lines, in their look', () => {
		const detail = createRawSnippet(() => ({
			render: () => '<span>Τηλεφωνήστε: <a href="tel:+306934445566">+30 693 444 5566</a></span>'
		}));
		render(NoticeCard, {
			props: { title: 'Το ραντεβού είναι σε 20 λεπτά.', detail, testId: 'soon' }
		});
		const box = screen.getByTestId('soon');
		const last = box.querySelectorAll('p')[1];
		expect(last.className).toContain('text-muted-foreground');
		expect(last.className).toContain('mt-1');
		expect(screen.getByRole('link', { name: '+30 693 444 5566' })).toHaveAttribute(
			'href',
			'tel:+306934445566'
		);
	});

	it('a part of the page says nothing aloud by itself; a notice after an action is a status', () => {
		const quiet = render(NoticeCard, { props: { title: 'α', testId: 'quiet' } });
		expect(screen.getByTestId('quiet')).not.toHaveAttribute('role');
		quiet.unmount();
		render(NoticeCard, { props: { title: 'β', tone: 'done', role: 'status', testId: 'saved' } });
		expect(screen.getByTestId('saved')).toHaveAttribute('role', 'status');
		expect(screen.getByTestId('saved').className).toContain('bg-success/10');
	});
});
