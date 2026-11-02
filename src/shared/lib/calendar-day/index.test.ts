import { describe, expect, it } from 'vitest';
import { formatCalendarDay, formatCalendarDayParts } from '.';

const DAY_LABEL = { day: 'numeric', month: 'short', weekday: 'short' } as const;

// The application's spec (`shared/lib/calendar-day/index.unit.spec.ts`), case for case (U-29.3, app = web).
describe('shared::lib::calendar-day', () => {
	it.each([
		['el', '2026-10-01', 'Πέμ 1 Οκτ'],
		['en', '2026-10-01', 'Thu, Oct 1'],
		['el', '2026-03-29', 'Κυρ 29 Μαρ'],
		['el', '2026-12-31', 'Πέμ 31 Δεκ']
	] as const)('prints the %s day %s as «%s»', (language, day, label) => {
		expect(formatCalendarDay(day, language, DAY_LABEL)).toBe(label);
	});

	it('prints whichever parts the caller asks for, and nothing else', () => {
		expect(formatCalendarDay('2026-08-12', 'el', { day: 'numeric', month: 'short' })).toBe(
			'12 Αυγ'
		);
		expect(formatCalendarDay('2026-08-12', 'en', { weekday: 'short' })).toBe('Wed');
		expect(formatCalendarDay('2026-03-25', 'el', { ...DAY_LABEL, year: 'numeric' })).toBe(
			'Τετ 25 Μαρ 2026'
		);
	});

	it('reads a day with stray whitespace, and refuses one that does not exist', () => {
		expect(formatCalendarDay(' 2026-08-12 ', 'en', { day: 'numeric' })).toBe('12');
		expect(formatCalendarDay('2026-02-31', 'el', DAY_LABEL)).toBeNull();
		expect(formatCalendarDay('2026-13-01', 'el', DAY_LABEL)).toBeNull();
		expect(formatCalendarDay('2026-1-5', 'el', DAY_LABEL)).toBeNull();
		expect(formatCalendarDay('12/08/2026', 'el', DAY_LABEL)).toBeNull();
		expect(formatCalendarDay('', 'el', DAY_LABEL)).toBeNull();
	});

	it('formatCalendarDayParts: the same day in its parts, on every device; none for a day the calendar lacks', () => {
		const parts = formatCalendarDayParts('2026-10-28', 'el', { day: 'numeric', month: 'short' });
		expect(parts.map((part) => part.value).join('')).toBe(
			formatCalendarDay('2026-10-28', 'el', { day: 'numeric', month: 'short' })
		);
		expect(parts.filter((part) => part.type !== 'literal')).toEqual([
			{ type: 'day', value: '28' },
			{ type: 'month', value: 'Οκτ' }
		]);
		expect(
			formatCalendarDayParts('2026-10-01', 'en', DAY_LABEL)
				.map((part) => part.value)
				.join('')
		).toBe('Thu, Oct 1');
		expect(formatCalendarDayParts('2026-02-31', 'el', DAY_LABEL)).toEqual([]);
	});
});
