import { describe, expect, it } from 'vitest';
import { load } from './+page';

const run = (step: string, href: string, slug = 'dr-a') =>
	load({ params: { slug, step }, url: new URL(href) } as never);

function thrown(call: () => unknown): { status?: number; location?: string } {
	try {
		call();
	} catch (error) {
		return error as { status?: number; location?: string };
	}
	return {};
}

describe('routes/doctors/[slug]/booking/[...step] load (P-W3 §3.1)', () => {
	it('screen 30 on a chosen hour; each «Αλλαγή» screen of the closed list', () => {
		expect(
			run('', 'http://localhost/doctors/dr-a/booking?office=o-1&date=2026-11-08&time=09:30')
		).toEqual({ step: null, appointmentId: null });
		expect(run('details/phone', 'http://localhost/doctors/dr-a/booking/details/phone')).toEqual({
			step: 'details/phone',
			appointmentId: null
		});
	});

	it('record §3.1: screen 30 without an hour goes to «Διαθεσιμότητα» first, keeping its hints and its language', () => {
		expect(
			thrown(() => run('', 'http://localhost/doctors/dr-a/booking?service=s-1&time=25:00'))
		).toMatchObject({ status: 307, location: '/doctors/dr-a/booking/time?service=s-1' });
		expect(thrown(() => run('', 'http://localhost/en/doctors/dr-a/booking'))).toMatchObject({
			status: 307,
			location: '/en/doctors/dr-a/booking/time'
		});
	});

	it('U-65.6 (negative): a step out of the list is a 404 — a guess, a path out, a step one level too deep', () => {
		for (const step of ['payment', '../admin', 'details', 'time/x', 'success/../time']) {
			expect(
				thrown(() => run(step, `http://localhost/doctors/dr-a/booking/${step}`)),
				step
			).toMatchObject({ status: 404 });
		}
	});

	it('screen 31 names its appointment; (negative) none, or not a plain id, is a 404', () => {
		expect(run('success', 'http://localhost/doctors/dr-a/booking/success?appointment=a-1')).toEqual(
			{ step: 'success', appointmentId: 'a-1' }
		);
		expect(
			thrown(() => run('success', 'http://localhost/doctors/dr-a/booking/success'))
		).toMatchObject({ status: 404 });
		expect(
			thrown(() =>
				run('success', 'http://localhost/doctors/dr-a/booking/success?appointment=%3Cscript%3E')
			)
		).toMatchObject({ status: 404 });
	});

	it('(negative) the redirect stays a path of this site whatever the slug', () => {
		expect(
			thrown(() => run('', 'http://localhost/doctors/x/booking', '//evil.example'))
		).toMatchObject({ location: '/doctors/%2F%2Fevil.example/booking/time' });
	});
});
