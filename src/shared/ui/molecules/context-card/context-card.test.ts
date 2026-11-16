import { describe, expect, it } from 'vitest';
import { createRawSnippet } from 'svelte';
import { render, screen } from '@testing-library/svelte';
import ContextCard from './context-card.svelte';

describe('ContextCard (what a step screen is about, over it; shared since D-W51-50)', () => {
	it('the word, the strong line and the muted lines, in order — the empty ones left out', () => {
		render(ContextCard, {
			props: {
				label: 'Το αίτημα',
				title: 'Σάββατο 14 Νοεμβρίου · 17:30',
				lines: ['Νίκος Μαυρίδης · Επίσκεψη · 30 λεπτά', '', null, 'Λεωφ. Κηφισίας 120'],
				testId: 'box'
			}
		});
		const box = screen.getByTestId('box');
		expect(box).toHaveAttribute('data-slot', 'context-card');
		expect([...box.querySelectorAll('span')].map((span) => span.textContent)).toEqual([
			'Το αίτημα',
			'Σάββατο 14 Νοεμβρίου · 17:30',
			'Νίκος Μαυρίδης · Επίσκεψη · 30 λεπτά',
			'Λεωφ. Κηφισίας 120'
		]);
		expect(box.className).toContain('rounded-md');
		expect(box.className).toContain('border-line');
	});

	it('(negative, U-65.6) every word is text, never HTML', () => {
		render(ContextCard, {
			props: { label: 'Το ραντεβού', title: '<b>x</b>', lines: ['<img src=x onerror=alert(1)>'] }
		});
		expect(document.querySelector('b')).toBeNull();
		expect(document.querySelector('img')).toBeNull();
		expect(screen.getByText('<b>x</b>')).toBeInTheDocument();
	});
	it('D-W51-70: a way on at the right (the caller’s), after the words, which then take the room; none by default', () => {
		const trailing = createRawSnippet(() => ({
			render: () => '<button type="button">Αλλαγή</button>'
		}));
		render(ContextCard, {
			props: {
				label: 'Έχει λογαριασμό',
				title: 'Ιωάννα Καρρά',
				trailing,
				testId: 'box',
				class: 'mb-0'
			}
		});
		const box = screen.getByTestId('box');
		expect(box.lastElementChild).toBe(screen.getByRole('button', { name: 'Αλλαγή' }));
		expect(box.className).toContain('mb-0');
		expect(box.querySelector('.grid')?.className).toContain('flex-1');
	});
});
