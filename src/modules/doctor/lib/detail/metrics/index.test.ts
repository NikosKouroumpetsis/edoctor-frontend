import { describe, expect, it } from 'vitest';
import { buildDoctorCompletedVisits, buildDoctorResponseRows } from './index';

describe('lib/detail metrics (the places the backend fills later)', () => {
	it('U-36.1 / U-43.1 (app = web): without the backend’s metrics there is no row — no response time, rate or visits', () => {
		expect(buildDoctorResponseRows(undefined, 'MANUAL', 'el')).toBeNull();
		expect(buildDoctorCompletedVisits(undefined, 'el')).toBeNull();
	});

	it('U-36.1 / U-43.2 (app = web): an office that confirms by hand (`MANUAL`) — «Χρόνος απόκρισης: Εντός μίας ώρας» and «Ρυθμός απόκρισης: 95%» (rounded down, «0%» shown), each with its 6-month line', () => {
		const rows = buildDoctorResponseRows(
			{ responseTimeId: 'within-hour', responseRatePercent: 95.8 },
			'MANUAL',
			'el'
		);
		expect(rows?.map((row) => row.id)).toEqual(['response-time', 'response-rate']);
		expect(rows?.[0]?.title).toBe('Χρόνος απόκρισης: Εντός μίας ώρας');
		expect(rows?.[0]?.description).toBe(
			'Σύμφωνα με τα ραντεβού των τελευταίων 6 μηνών στην πλατφόρμα.'
		);
		expect(rows?.[1]?.title).toBe('Ρυθμός απόκρισης: 95%');
		expect(buildDoctorResponseRows({ responseRatePercent: 0 }, 'MANUAL', 'el')?.[0]?.title).toBe(
			'Ρυθμός απόκρισης: 0%'
		);
	});

	it('U-36.5 (app = web): the four ids of the approved design (§A.2/§C.1), each with the owner’s words', () => {
		const titleOf = (
			responseTimeId: 'within-hour' | 'within-few-hours' | 'within-day' | 'few-days'
		) => buildDoctorResponseRows({ responseTimeId }, 'MANUAL', 'el')?.[0]?.title;
		expect(titleOf('within-hour')).toBe('Χρόνος απόκρισης: Εντός μίας ώρας');
		expect(titleOf('within-few-hours')).toBe('Χρόνος απόκρισης: Εντός λίγων ωρών');
		expect(titleOf('within-day')).toBe('Χρόνος απόκρισης: Εντός μίας ημέρας');
		expect(titleOf('few-days')).toBe('Χρόνος απόκρισης: Σε λίγες ημέρες');
	});

	it('U-43.2 / U-36.5 (app = web): the ACTIVE office confirms by itself (its slots’ `AUTO`) — «Άμεση επιβεβαίωση» alone, without metrics, and no rate', () => {
		const rows = buildDoctorResponseRows({ responseRatePercent: 95 }, 'AUTO', 'el');
		expect(rows?.map((row) => row.title)).toEqual(['Χρόνος απόκρισης: Άμεση επιβεβαίωση']);
	});

	it('U-43.2 — MINOR-2 of r1 (app = web): no confirmation known (the slots still coming, no services) is no row at all, whatever the metrics', () => {
		const metrics = { responseTimeId: 'within-hour', responseRatePercent: 95 } as const;
		expect(buildDoctorResponseRows(metrics, undefined, 'el')).toBeNull();
	});

	it('U-36.1: an impossible rate or an unknown time id is no row', () => {
		expect(buildDoctorResponseRows({ responseRatePercent: 140 }, 'MANUAL', 'el')).toBeNull();
		expect(buildDoctorResponseRows({ responseRatePercent: Number.NaN }, 'MANUAL', 'el')).toBeNull();
		expect(
			buildDoctorResponseRows(
				{ responseTimeId: 'WITHIN_HOUR' as unknown as 'within-hour' },
				'MANUAL',
				'el'
			)
		).toBeNull();
	});

	it('U-43.1 (app = web): «Ολοκληρωμένες επισκέψεις (6 μήνες): 523», shown only above 0', () => {
		expect(buildDoctorCompletedVisits({ completedVisits: 523 }, 'el')).toBe(
			'Ολοκληρωμένες επισκέψεις (6 μήνες): 523'
		);
		expect(buildDoctorCompletedVisits({ completedVisits: 0 }, 'el')).toBeNull();
	});

	it('U-43.2 — r4 (app = web): the rate’s line says what it is, never «σταθερά απάντηση» beside a «0%» — the 6 months’ share answered', () => {
		const rows = buildDoctorResponseRows({ responseRatePercent: 0 }, 'MANUAL', 'el');
		expect(rows?.[0]?.description).toBe(
			'Ποσοστό αιτημάτων για ραντεβού που απαντήθηκαν τους τελευταίους 6 μήνες.'
		);
		expect(
			buildDoctorResponseRows({ responseRatePercent: 0 }, 'MANUAL', 'en')?.[0]?.description
		).toBe('Share of appointment requests answered in the last 6 months.');
		expect(JSON.stringify(rows)).not.toMatch(/σταθερά/u);
	});
});
