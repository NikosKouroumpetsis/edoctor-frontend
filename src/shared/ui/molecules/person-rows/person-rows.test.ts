import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import PersonRows from './person-rows.svelte';

const rows = [
	{ id: 'p1', name: 'Ιωάννα Καρρά', lines: ['+30 697 765 4321 · 4 επισκέψεις'] },
	{ id: 'p3', name: 'Καλλιόπη Ζέρβα', lines: ['+30 697 100 2003'], note: 'Χωρίς λογαριασμό' },
	{ id: 'new', name: 'Νέος', lines: ['Όνομα και κινητό'], glyph: 'add' as const }
];

describe('PersonRows (the row of a person with the initials, D-W51-03; screens 72, 73, 74)', () => {
	it('each person a press of its own: the initials (or the sign), the name, the lines, the quiet word — in order', async () => {
		const onSelect = vi.fn();
		render(PersonRows, { props: { rows, onSelect, label: 'Πρόσφατοι', testId: 'people' } });
		const list = screen.getByRole('list', { name: 'Πρόσφατοι' });
		expect(list).toHaveAttribute('data-slot', 'person-rows');
		const buttons = within(list).getAllByRole('button');
		expect(buttons).toHaveLength(3);
		expect(buttons[0]).toHaveTextContent('ΙΚ');
		expect(buttons[0]).toHaveTextContent('Ιωάννα Καρρά');
		expect(buttons[0]).toHaveTextContent('+30 697 765 4321 · 4 επισκέψεις');
		expect(buttons[1]?.querySelector('[data-slot="person-rows-note"]')).toHaveTextContent(
			'Χωρίς λογαριασμό'
		);
		expect(buttons[0]?.querySelector('[data-slot="person-rows-note"]')).toBeNull();
		// The sign instead of the initials, on the chip's fill.
		expect(buttons[2]?.querySelector('.bg-chip svg')).not.toBeNull();
		await userEvent.click(buttons[1] as HTMLElement);
		// The press too (since screen 73: a link row may open in place), after the row's id.
		expect(onSelect).toHaveBeenCalledWith('p3', expect.any(MouseEvent));
	});

	it('U-02.1: 72 high and one line between rows, no colour under the pointer (U-100)', () => {
		render(PersonRows, { props: { rows, onSelect: () => {}, label: 'x' } });
		const buttons = screen.getAllByRole('button');
		for (const button of buttons) {
			expect(button.className).toContain('min-h-row-lg');
			expect(button.className).not.toMatch(/hover:bg-/u);
		}
		const items = screen.getAllByRole('listitem');
		expect(items[0]?.className).not.toContain('border-t');
		expect(items[1]?.className).toContain('border-t');
	});

	it('(negative, U-65.6) every word is text, never HTML', () => {
		render(PersonRows, {
			props: {
				rows: [
					{ id: 'x', name: '<b>x</b>', lines: ['<img src=x onerror=alert(1)>'], note: '<i>y</i>' }
				],
				onSelect: () => {},
				label: 'x'
			}
		});
		expect(document.querySelector('b')).toBeNull();
		expect(document.querySelector('img')).toBeNull();
		expect(document.querySelector('i')).toBeNull();
		expect(screen.getByText('<b>x</b>')).toBeInTheDocument();
	});

	it("D-W51-74 · U-112 (`lines`, the 55's rows of screen 73): each person a LINK one under the other, no frame, a line under each, the circle 48 and the name 16; the open one filled from 1128 and `aria-current`", async () => {
		const onSelect = vi.fn((_id: string, event: MouseEvent) => event.preventDefault());
		render(PersonRows, {
			props: {
				look: 'lines',
				selectedId: 'p3',
				label: 'Οι ασθενείς μου',
				onSelect,
				rows: rows.slice(0, 2).map((row) => ({ ...row, href: `/doctor/patients/${row.id}` }))
			}
		});
		const list = screen.getByRole('list', { name: 'Οι ασθενείς μου' });
		expect(list).toHaveAttribute('data-look', 'lines');
		expect(list.className).not.toMatch(/\bborder\b/u);
		expect(within(list).queryAllByRole('button')).toHaveLength(0);
		const links = within(list).getAllByRole('link');
		expect(links.map((link) => link.getAttribute('href'))).toEqual([
			'/doctor/patients/p1',
			'/doctor/patients/p3'
		]);
		const items = within(list).getAllByRole('listitem');
		for (const item of items) expect(item.className).toContain('border-b');
		expect(items[1]?.className).toContain('laptop:bg-chip');
		expect(items[0]?.className).not.toContain('bg-chip');
		expect(links[1]).toHaveAttribute('aria-current', 'page');
		expect(links[0]).not.toHaveAttribute('aria-current');
		expect(links[0]?.querySelector('[data-slot="avatar"], .size-avatar-lg')).not.toBeNull();
		await userEvent.click(links[0] as HTMLElement);
		expect(onSelect).toHaveBeenCalledWith('p1', expect.any(MouseEvent));
	});
});
