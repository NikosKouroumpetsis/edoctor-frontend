import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SAMPLE_NOW, sampleAvailability, sampleDoctorProfile } from '../detail.sample';
import { buildDoctorBookingContent, buildDoctorSimilarSearch } from './index';
import type { DoctorProfile } from '$modules/doctor/api/profile';

const SIMILAR = '/doctors?what=Παθολόγος&whatKind=professional&whereKind=location&whereSlug=athina';
const withTimes = {
	'off-1': sampleAvailability('off-1', { '2026-11-01': [600, 660] }),
	'off-2': sampleAvailability('off-2')
};
const empty = { 'off-1': sampleAvailability('off-1'), 'off-2': sampleAvailability('off-2') };

function booking(
	overrides: Partial<Parameters<typeof buildDoctorBookingContent>[0]> & {
		doctor?: DoctorProfile;
	} = {}
) {
	return buildDoctorBookingContent({
		doctor: sampleDoctorProfile(),
		availabilityByOffice: withTimes,
		availabilityState: 'answered',
		activeOfficeId: 'off-1',
		activePhone: '2101234567',
		serviceId: 'svc-1',
		selectedSlot: null,
		similarHref: SIMILAR,
		locale: 'el',
		now: SAMPLE_NOW,
		...overrides
	});
}

describe('lib/detail booking', () => {
	it('U-37 / U-34.4 (app = web): with a time to book — the guest’s «Συνδεθείτε για κόστος», the service, the next time of the active office, «Κράτηση»', () => {
		const content = booking();
		expect(content.mode).toBe('book');
		expect(content.fee).toEqual({ kind: 'login', label: 'Συνδεθείτε για κόστος' });
		expect(content.serviceTitle).toBe('Simple visit');
		expect(content.nextLabel).toBe('Επόμενη διαθεσιμότητα: Αύριο · 10:00');
		expect(content.whenLine).toBe('Αύριο · 10:00 · Νίκης 12');
		expect(content.ctaLabel).toBe('Κράτηση');
		expect(content.statement).toBeNull();
	});

	it('U-40.3 (app = web): a confirmed time becomes the card’s «ΗΜΕΡΟΜΗΝΙΑ & ΩΡΑ» and the bar’s line', () => {
		const content = booking({
			selectedSlot: { officeId: 'off-1', date: '2026-11-01', startMinute: 660 }
		});
		expect(content.chosenLabel).toBe('Αύριο · 11:00');
		expect(content.whenLine).toBe('Αύριο · 11:00 · Νίκης 12');
	});

	it('U-37 case 1 (app = web): services, no time in 4 weeks — the statement, «Δείτε παρόμοιους γιατρούς» first, «Κλήση ιατρείου» second; κανένα sign-in για κράτηση (the fee keeps «Συνδεθείτε για κόστος») — NIT-8 of r1', () => {
		const content = booking({ availabilityByOffice: empty });
		expect(content.mode).toBe('no-slots');
		expect(content.statement).toBe('Δεν υπάρχουν διαθέσιμες ώρες τις επόμενες 4 εβδομάδες');
		expect(content.primary).toEqual({
			kind: 'similar',
			label: 'Δείτε παρόμοιους γιατρούς',
			href: SIMILAR
		});
		expect(content.secondary).toEqual({
			kind: 'call',
			label: 'Κλήση ιατρείου',
			href: 'tel:2101234567'
		});
		expect(content.phoneLabel).toBe('2101234567');
		expect(content.fee).toEqual({ kind: 'login', label: 'Συνδεθείτε για κόστος' });
		const actions = [content.primary, content.secondary].filter((entry) => entry !== null);
		expect(actions.map((entry) => entry.href)).toEqual([SIMILAR, 'tel:2101234567']);
		expect(actions.some((entry) => /\/login/u.test(entry.href))).toBe(false);
		expect(JSON.stringify(content)).not.toMatch(/mock/u);
	});

	it('U-37 case 2 (app = web): no services — «Τα ραντεβού κλείνονται τηλεφωνικά», the call first; without a phone «Επικοινωνήστε για διαθεσιμότητα» and the similar search alone; no fee line (U-38.1)', () => {
		const byPhone = booking({
			doctor: sampleDoctorProfile({ services: [] }),
			serviceId: undefined
		});
		expect(byPhone.mode).toBe('by-phone');
		expect(byPhone.statement).toBe('Τα ραντεβού κλείνονται τηλεφωνικά');
		expect(byPhone.primary?.kind).toBe('call');
		expect(byPhone.secondary?.kind).toBe('similar');
		expect(byPhone.fee).toBeNull();
		const contact = booking({
			doctor: sampleDoctorProfile({ services: [] }),
			serviceId: undefined,
			activePhone: undefined
		});
		expect(contact.mode).toBe('contact');
		expect(contact.statement).toBe('Επικοινωνήστε για διαθεσιμότητα');
		expect(contact.primary?.kind).toBe('similar');
		expect(contact.secondary).toBeNull();
		expect(contact.fee).toBeNull();
	});

	it('U-37 case 3 (app = web): the active office has no time while another has — «Διαθέσιμο στο ιατρείο Χ από …», the office and the time emphasized', () => {
		const content = booking({ activeOfficeId: 'off-2', activePhone: undefined });
		expect(content.mode).toBe('book');
		expect(content.whenLine).toBeNull();
		expect(content.elsewhere?.officeId).toBe('off-1');
		expect(content.elsewhere?.label).toBe('Διαθέσιμο στο ιατρείο Νίκης 12 από Αύριο · 10:00');
		expect(content.elsewhere?.segments.filter((segment) => segment.emphasis)).toEqual([
			{ emphasis: true, text: 'Νίκης 12' },
			{ emphasis: true, text: 'Αύριο · 10:00' }
		]);
	});

	it('U-37 / lesson 7: while the windows are read nothing is claimed; a failed read says so with «Δοκιμάστε ξανά» — never «no time»', () => {
		const waiting = booking({ availabilityByOffice: {}, availabilityState: 'waiting' });
		expect(waiting.waiting).toBe(true);
		expect(waiting.mode).toBe('book');
		expect(waiting.statement).toBeNull();
		const failed = booking({ availabilityByOffice: {}, availabilityState: 'failed' });
		expect(failed.failed).toEqual({
			message: 'Δεν μπορέσαμε να φορτώσουμε τις διαθέσιμες ώρες.',
			retryLabel: 'Δοκιμάστε ξανά'
		});
		expect(failed.mode).toBe('book');
	});

	it('U-43.3 (app = web): case 1 is the statement, «Δείτε παρόμοιους γιατρούς» and «Κλήση ιατρείου» — no «Ειδοποίησέ με», no place for it', () => {
		const content = booking({ availabilityByOffice: empty });
		expect(Object.keys(content).some((key) => /notify/iu.test(key))).toBe(false);
		expect(JSON.stringify(content)).not.toMatch(/Ειδοποίησ|Notify/u);
		expect([content.primary?.kind, content.secondary?.kind]).toEqual(['similar', 'call']);
		for (const language of ['el', 'en']) {
			const catalog = readFileSync(join(process.cwd(), `messages/${language}.json`), 'utf8');
			expect(catalog).not.toMatch(/doctor_[a-z_]*notify|Ειδοποίησέ με|Notify me/u);
		}
	});

	it('U-37.2 (app = web, the application’s `buildDoctorSimilarSearch`): the specialty’s id, words and slug and the ACTIVE office’s city — nothing the doctor lacks', () => {
		expect(buildDoctorSimilarSearch(sampleDoctorProfile(), ' Θεσσαλονίκη ')).toEqual({
			city: 'Θεσσαλονίκη',
			professionalId: 'pro-1',
			professionalName: 'Παθολόγος',
			professionalSlug: 'pathologos'
		});
		expect(
			buildDoctorSimilarSearch(sampleDoctorProfile({ professional: undefined }), '  ')
		).toEqual({});
	});
});
