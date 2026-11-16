import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import StatusRow from './status-row.svelte';

/* D-W51-03 · the row of a thing with a state (screen 73's appointments, `sw.css:281-288` `.w-aprow`). Made-up words. */

describe('StatusRow (D-W51-03; screen 73)', () => {
	it('ONE link: the title over its muted line, the state’s pill and «›»; a press reaches the caller', async () => {
		const onclick = vi.fn((event: MouseEvent) => event.preventDefault());
		render(StatusRow, {
			props: {
				title: 'Δευτέρα 16 Νοεμβρίου · 11:00',
				subtitle: 'Επανέλεγχος · 20 λεπτά · Πατησίων 45',
				pill: { label: 'Επιβεβαιωμένο', tone: 'success' },
				href: '/doctor/appointments/a1',
				onclick,
				testId: 'row'
			}
		});
		const link = screen.getByRole('link');
		expect(link).toHaveAttribute('href', '/doctor/appointments/a1');
		expect(link).toHaveAttribute('data-slot', 'status-row');
		expect(link).toHaveTextContent('Δευτέρα 16 Νοεμβρίου · 11:00');
		expect(link).toHaveTextContent('Επανέλεγχος · 20 λεπτά · Πατησίων 45');
		expect(screen.getByTestId('row-status')).toHaveTextContent('Επιβεβαιωμένο');
		expect(screen.getByTestId('row-status')).toHaveAttribute('data-tone', 'success');
		expect(link.className).toContain('border-b');
		expect(link.className).not.toMatch(/hover:bg-/u);
		await userEvent.click(link);
		expect(onclick).toHaveBeenCalledTimes(1);
	});

	it('without a state, no pill; (negative, U-65.6) every word is text, never HTML', () => {
		render(StatusRow, {
			props: { title: '<b>x</b>', subtitle: '<img src=x onerror=alert(1)>', href: '#' }
		});
		expect(document.querySelector('[data-slot="status-pill"]')).toBeNull();
		expect(document.querySelector('b')).toBeNull();
		expect(document.querySelector('img')).toBeNull();
		expect(screen.getByText('<b>x</b>')).toBeInTheDocument();
	});
});
