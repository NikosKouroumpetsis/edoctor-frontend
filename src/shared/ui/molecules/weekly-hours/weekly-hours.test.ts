import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import WeeklyHours from './weekly-hours.svelte';

describe('WeeklyHours (U-68.1 Π5)', () => {
	it('groups as given: each range on its line, a closed day in words, today marked', () => {
		const { container } = render(WeeklyHours, {
			props: {
				closedLabel: 'Κλειστό',
				todayLabel: 'Σήμερα',
				testId: 'hours',
				rows: [
					{ id: 'a', days: 'Δευ–Παρ', ranges: ['09:00–14:00', '17:00–20:00'], today: true },
					{ id: 'b', days: 'Κυρ', ranges: [], today: false }
				]
			}
		});
		expect(screen.getByTestId('hours').querySelectorAll('dt')).toHaveLength(2);
		expect(container.querySelector('[data-today]')?.textContent).toContain('Σήμερα');
		expect(container.querySelector('[data-today]')?.textContent).toContain('17:00–20:00');
		expect(screen.getByText('Κλειστό')).toBeInTheDocument();
	});
});
