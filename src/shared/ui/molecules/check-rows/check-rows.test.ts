import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import CheckRows from './check-rows.svelte';

const options = [
	{ value: 'visit', label: 'Επίσκεψη', detail: '30 λεπτά · 60 €' },
	{ value: 'ecg', label: 'Ηλεκτροκαρδιογράφημα', detail: '20 λεπτά · 30 €' }
];

describe('CheckRows (many choices; shared since D-W51-52)', () => {
	it('🔴 U-112: one row under the other, framed, each a checkbox with its words and its muted line', () => {
		render(CheckRows, {
			props: { label: 'Υπηρεσίες', options, values: ['ecg'], onToggle: () => {}, testId: 'rows' }
		});
		const group = screen.getByRole('group', { name: 'Υπηρεσίες' });
		expect(group).toHaveAttribute('data-slot', 'check-rows');
		expect(group.className).toContain('flex-col');
		expect(group.className).not.toMatch(/\bgrid-cols-|\bflex-row\b/);
		const boxes = screen.getAllByRole('checkbox');
		expect(boxes.map((box) => box.getAttribute('aria-checked'))).toEqual(['false', 'true']);
		expect(boxes[0]).toHaveTextContent('Επίσκεψη 30 λεπτά · 60 €');
		expect(boxes[0].className).toContain('min-h-control-xl');
		expect(boxes[1].className).toContain('border-t');
		const tick = boxes[1].querySelector('[data-slot="check-rows-box"]');
		expect(tick).toHaveAttribute('data-state', 'checked');
		expect(tick?.className).toContain('rounded-checkbox');
	});

	it('a press names its row’s value; the caller says what is chosen', async () => {
		const onToggle = vi.fn();
		render(CheckRows, { props: { label: 'Υπηρεσίες', options, values: [], onToggle } });
		await userEvent.click(screen.getByRole('checkbox', { name: /Ηλεκτροκαρδιογράφημα/u }));
		expect(onToggle).toHaveBeenCalledWith('ecg');
		expect(
			screen.getAllByRole('checkbox').every((box) => box.getAttribute('aria-checked') === 'false')
		).toBe(true);
	});

	it('🔴 D-W52-59 · U-112: a row the caller holds back stays in the list, dimmed and `aria-disabled`, and its press names nothing; the chosen rows and the free ones answer as before', async () => {
		const onToggle = vi.fn();
		render(CheckRows, {
			props: {
				label: 'Υπηρεσίες',
				options: [
					{ value: 'visit', label: 'Επίσκεψη' },
					{ value: 'ecg', label: 'Ηλεκτροκαρδιογράφημα', disabled: true },
					{ value: 'echo', label: 'Υπέρηχος καρδιάς', disabled: false }
				],
				values: ['visit'],
				onToggle
			}
		});
		const [chosen, held, free] = screen.getAllByRole('checkbox');
		expect(held).toHaveAttribute('aria-disabled', 'true');
		expect(held).toHaveAttribute('aria-checked', 'false');
		// It is no `disabled` button: it keeps its place for the keyboard, and a reader hears why it does not answer.
		expect(held).not.toBeDisabled();
		expect(held.querySelector('[data-slot="check-rows-box"]')?.className).toContain('opacity-45');
		expect(held.firstElementChild?.className).toContain('opacity-45');
		expect(chosen).not.toHaveAttribute('aria-disabled');
		expect(free).not.toHaveAttribute('aria-disabled');
		expect(chosen.innerHTML).not.toContain('opacity-45');
		expect(free.innerHTML).not.toContain('opacity-45');

		await userEvent.click(held);
		held.focus();
		await userEvent.keyboard('{Enter}');
		await userEvent.keyboard(' ');
		expect(onToggle).not.toHaveBeenCalled();

		await userEvent.click(chosen);
		await userEvent.click(free);
		expect(onToggle.mock.calls).toEqual([['visit'], ['echo']]);
	});

	it('(negative) U-65.6: a word with markup is text; U-100: no colour under the pointer', () => {
		render(CheckRows, {
			props: {
				label: 'x',
				options: [{ value: 'a', label: '<b>A</b>', detail: '<i>d</i>' }],
				values: [],
				onToggle: () => {}
			}
		});
		const box = screen.getByRole('checkbox');
		expect(box.querySelector('b, i')).toBeNull();
		expect(box).toHaveTextContent('<b>A</b>');
		expect(box.className).not.toMatch(/hover:bg-|hover:text-/);
	});
});
