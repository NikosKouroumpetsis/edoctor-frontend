import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import DiffBox from './diff-box.svelte';

describe('DiffBox (the 52’s «Ήταν / Νέα ώρα»; shared since D-W51-51)', () => {
	it('each row its muted label and its value — what it was struck through — and the note under a line', () => {
		render(DiffBox, {
			props: {
				rows: [
					{ id: 'was', label: 'Ήταν', value: 'Σάββατο 14 Νοεμβρίου · 17:30', struck: true },
					{ id: 'next', label: 'Νέα ώρα', value: 'Δευτέρα 16 Νοεμβρίου · 09:00' }
				],
				note: 'Ο ασθενής ενημερώνεται αυτόματα.',
				testId: 'diff'
			}
		});
		const box = screen.getByTestId('diff');
		expect(box).toHaveAttribute('data-slot', 'diff-box');
		expect(box.className).toContain('border-line-2');
		expect(box.querySelector('[data-row="was"] s')).toHaveTextContent(
			'Σάββατο 14 Νοεμβρίου · 17:30'
		);
		const next = box.querySelector('[data-row="next"] span:last-child');
		expect(next).toHaveTextContent('Δευτέρα 16 Νοεμβρίου · 09:00');
		expect(next?.className).toContain('font-semibold');
		expect(box.querySelector('[data-row="next"] s')).toBeNull();
		expect(box.lastElementChild).toHaveTextContent('Ο ασθενής ενημερώνεται αυτόματα.');
		expect(box.lastElementChild?.className).toContain('border-t');
	});

	it('a caller’s margin wins over the box’s own; (negative) no note, no line; every word a text node (U-65.6)', () => {
		render(DiffBox, {
			props: {
				rows: [{ id: 'sum', label: '<b>x</b>', value: '<i>y</i>' }],
				testId: 'diff',
				class: 'mt-4'
			}
		});
		const box = screen.getByTestId('diff');
		expect(box.className).toContain('mt-4');
		expect(box.className).not.toContain('mt-5');
		expect(box.querySelectorAll('p')).toHaveLength(1);
		expect(box.querySelector('b, i')).toBeNull();
		expect(box).toHaveTextContent('<b>x</b>');
	});
});
