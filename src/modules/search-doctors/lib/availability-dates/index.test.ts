import { describe, expect, it } from 'vitest';
import { PLATFORM_TIME_ZONE } from '$shared/config/time-zone';
import { AVAILABILITY_WINDOW_END_OFFSET, buildAvailabilityDateLabels } from '.';

const NBSP = ' ';
const spaced = (labels: Record<string, string>) =>
	Object.fromEntries(
		Object.entries(labels).map(([key, value]) => [key, value.replaceAll(NBSP, ' ')])
	);

// Noon on the Greek clock (UTC+2 in late October and in December).
const OCT_28_2026 = Date.UTC(2026, 9, 28, 10);
const DEC_30_2026 = Date.UTC(2026, 11, 30, 10);

describe('search-doctors::availability-dates', () => {
	it('U-22: the backend’s windows from today — today, today + 2, today + 6', () => {
		expect(AVAILABILITY_WINDOW_END_OFFSET).toEqual({ today: 0, next3Days: 2, next7Days: 6 });
	});

	it('U-22: on 28/10/2026 the rows read «Τετ 28 Οκτ» · «28 – 30 Οκτ» · «28 Οκτ – 3 Νοε»', () => {
		expect(spaced(buildAvailabilityDateLabels(OCT_28_2026, 'el', PLATFORM_TIME_ZONE))).toEqual({
			today: 'Τετ 28 Οκτ',
			next3Days: '28 – 30 Οκτ',
			next7Days: '28 Οκτ – 3 Νοε'
		});
	});

	it('U-22: on 30/12/2026 the windows cross the year — «Τετ 30 Δεκ» · «30 Δεκ – 1 Ιαν» · «30 Δεκ – 5 Ιαν»', () => {
		expect(spaced(buildAvailabilityDateLabels(DEC_30_2026, 'el', PLATFORM_TIME_ZONE))).toEqual({
			today: 'Τετ 30 Δεκ',
			next3Days: '30 Δεκ – 1 Ιαν',
			next7Days: '30 Δεκ – 5 Ιαν'
		});
	});

	it('U-22: in English the language’s own order — «Wed, Oct 28» · «Oct 28 – 30» · «Oct 28 – Nov 3»', () => {
		expect(spaced(buildAvailabilityDateLabels(OCT_28_2026, 'en', PLATFORM_TIME_ZONE))).toEqual({
			today: 'Wed, Oct 28',
			next3Days: 'Oct 28 – 30',
			next7Days: 'Oct 28 – Nov 3'
		});
	});

	it('U-22 (negative): today is the Greek clock’s day, never the device’s or UTC’s', () => {
		// 22:30 UTC on 28/10 is 00:30 on 29/10 in Athens.
		const lateUtc = Date.UTC(2026, 9, 28, 22, 30);
		expect(spaced(buildAvailabilityDateLabels(lateUtc, 'el', PLATFORM_TIME_ZONE)).today).toBe(
			'Πέμ 29 Οκτ'
		);
	});

	it('U-22: a day and its month never part on two lines; a window that crosses a month breaks only after its dash', () => {
		const labels = buildAvailabilityDateLabels(OCT_28_2026, 'el', PLATFORM_TIME_ZONE);
		expect(labels.today).toBe(`Τετ${NBSP}28${NBSP}Οκτ`);
		expect(labels.next3Days).toBe(`28${NBSP}–${NBSP}30${NBSP}Οκτ`);
		expect(labels.next7Days).toBe(`28${NBSP}Οκτ${NBSP}– 3${NBSP}Νοε`);
	});
});
