import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import RadioRows from './radio-rows.svelte';

const OPTIONS = [
	{ value: 'a', label: 'Δεν είμαι διαθέσιμος/η' },
	{ value: 'b', label: 'Έκτακτο περιστατικό' },
	{ value: 'c', label: 'Άλλος λόγος' }
];

describe('RadioRows (U-112: one choice as rows, never tiles; shared since D-W51-50)', () => {
	it('a radio group of whole rows, none chosen at first: the first row is the one Tab stop', () => {
		render(RadioRows, {
			props: { label: 'Λόγος', value: null, options: OPTIONS, onChange: vi.fn() }
		});
		const group = screen.getByRole('radiogroup', { name: 'Λόγος' });
		expect(group).toHaveAttribute('data-slot', 'radio-rows');
		const rows = screen.getAllByRole('radio');
		expect(rows.map((row) => row.textContent?.trim())).toEqual(OPTIONS.map((o) => o.label));
		expect(rows.map((row) => row.getAttribute('aria-checked'))).toEqual([
			'false',
			'false',
			'false'
		]);
		expect(rows.map((row) => row.tabIndex)).toEqual([0, -1, -1]);
		for (const row of rows) expect(row.className).toContain('min-h-row');
	});

	it('a press chooses; the chosen one is checked and the Tab stop; the arrows move the choice', async () => {
		const onChange = vi.fn();
		const { rerender } = render(RadioRows, {
			props: { label: 'Λόγος', value: null, options: OPTIONS, onChange }
		});
		await fireEvent.click(screen.getAllByRole('radio')[1]);
		expect(onChange).toHaveBeenLastCalledWith('b');
		await rerender({ label: 'Λόγος', value: 'b', options: OPTIONS, onChange });
		const rows = screen.getAllByRole('radio');
		expect(rows[1]).toHaveAttribute('aria-checked', 'true');
		expect(rows.map((row) => row.tabIndex)).toEqual([-1, 0, -1]);
		rows[1].focus();
		await fireEvent.keyDown(rows[1], { key: 'ArrowDown' });
		expect(onChange).toHaveBeenLastCalledWith('c');
	});

	it('framed at every width with `always`; below 744 only by default', () => {
		const { unmount } = render(RadioRows, {
			props: { label: 'Λόγος', value: null, options: OPTIONS, onChange: vi.fn(), frame: 'always' }
		});
		expect(screen.getByRole('radiogroup').className).toContain('border-line-2');
		expect(screen.getByRole('radiogroup').className).not.toContain('tablet:border-0');
		unmount();
		render(RadioRows, {
			props: { label: 'Λόγος', value: null, options: OPTIONS, onChange: vi.fn() }
		});
		expect(screen.getByRole('radiogroup').className).toContain('tablet:border-0');
	});

	it('(negative, U-65.6) a label is text, never HTML; no colour under the pointer (U-100)', () => {
		render(RadioRows, {
			props: {
				label: 'Λόγος',
				value: null,
				options: [{ value: 'x', label: '<img src=x onerror=alert(1)>' }],
				onChange: vi.fn()
			}
		});
		const row = screen.getByRole('radio');
		expect(row.querySelector('img')).toBeNull();
		expect(row).toHaveTextContent('<img src=x onerror=alert(1)>');
		expect(row.className).not.toMatch(/hover:/u);
	});

	it('D-W51-62: a row’s quiet note after its label («όπως είναι τώρα»), muted and small, part of its name; none by default', () => {
		render(RadioRows, {
			props: {
				label: 'Τι έγινε τελικά;',
				value: 'COMPLETED',
				options: [
					{ value: 'COMPLETED', label: 'Ολοκληρώθηκε', note: 'όπως είναι τώρα' },
					{ value: 'NO_SHOW', label: 'Δεν ήρθε' }
				],
				onChange: vi.fn()
			}
		});
		const [now, other] = screen.getAllByRole('radio');
		expect(now).toHaveAccessibleName('Ολοκληρώθηκε όπως είναι τώρα');
		const note = now.querySelector('[data-slot="radio-rows-note"]');
		expect(note).toHaveTextContent('όπως είναι τώρα');
		expect(note?.className).toContain('text-muted-foreground');
		expect(note?.className).toContain('text-label-md');
		expect(other.querySelector('[data-slot="radio-rows-note"]')).toBeNull();
		expect(other.textContent?.trim()).toBe('Δεν ήρθε');
	});

	it('wave 5.2 · screen 85 (`sw.css:627-628` `.w-arkind`): with `notePlace="under"` the note stands on its own line under the label — 13 muted, 2 apart — part of its name', () => {
		render(RadioRows, {
			props: {
				label: 'Είδος',
				value: 'a',
				notePlace: 'under',
				options: [
					{ value: 'a', label: 'Άρθρο', note: 'Εξηγεί ένα θέμα υγείας.' },
					{ value: 'b', label: 'Συμβουλή' }
				],
				onChange: vi.fn()
			}
		});
		const [first, second] = screen.getAllByRole('radio');
		expect(first).toHaveAccessibleName('Άρθρο Εξηγεί ένα θέμα υγείας.');
		const note = first.querySelector('[data-slot="radio-rows-note"]');
		expect(note).toHaveClass('text-label-lg', 'font-normal', 'text-muted-foreground');
		expect(note?.className).not.toContain('ms-1.5');
		expect(note?.parentElement).toHaveClass('flex-col', 'gap-0.5');
		expect(note?.previousElementSibling).toHaveTextContent('Άρθρο');
		expect(second.querySelector('[data-slot="radio-rows-note"]')).toBeNull();
	});

	it('(negative, U-65.6) a note is text, never HTML', () => {
		render(RadioRows, {
			props: {
				label: 'x',
				value: null,
				options: [{ value: 'a', label: 'a', note: '<b>b</b>' }],
				onChange: vi.fn()
			}
		});
		expect(screen.getByRole('radio').querySelector('b')).toBeNull();
		expect(screen.getByRole('radio')).toHaveTextContent('<b>b</b>');
	});
	it('D-W51-70: a row with a detail — the label bold, the detail muted under it, 64 high; part of its name; none by default', () => {
		render(RadioRows, {
			props: {
				label: 'Ιατρείο',
				value: 'a',
				options: [
					{ value: 'a', label: 'Κηφισίας 120', detail: 'Λεωφ. Κηφισίας 120, Αθήνα 115 26' },
					{ value: 'b', label: 'Πατησίων 45' }
				],
				onChange: vi.fn()
			}
		});
		const [first, second] = screen.getAllByRole('radio');
		expect(first).toHaveAccessibleName('Κηφισίας 120 Λεωφ. Κηφισίας 120, Αθήνα 115 26');
		expect(first?.className).toContain('min-h-control-xl');
		const detail = first?.querySelector('[data-slot="radio-rows-detail"]');
		expect(detail).toHaveTextContent('Λεωφ. Κηφισίας 120, Αθήνα 115 26');
		expect(detail?.className).toContain('text-muted-foreground');
		expect(second?.className).not.toContain('min-h-control-xl');
		expect(second?.querySelector('[data-slot="radio-rows-detail"]')).toBeNull();
	});

	it('(negative, U-65.6) a detail is text, never HTML', () => {
		render(RadioRows, {
			props: {
				label: 'x',
				value: null,
				options: [{ value: 'a', label: 'a', detail: '<img src=x onerror=alert(1)>' }],
				onChange: vi.fn()
			}
		});
		expect(screen.getByRole('radio').querySelector('img')).toBeNull();
		expect(screen.getByRole('radio')).toHaveTextContent('<img src=x onerror=alert(1)>');
	});
});
