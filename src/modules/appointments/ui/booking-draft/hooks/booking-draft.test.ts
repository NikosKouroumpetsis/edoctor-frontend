import { describe, expect, it } from 'vitest';
import { BookingDraft } from './booking-draft.svelte';

const hints = { office: 'off-a', date: '2026-11-08', time: '09:30', service: 'svc-simple' };

describe('appointments::BookingDraft (🔴 U-112.2, P-W3 §3.2.8)', () => {
	it('a booking page opens from its address: the doctor, the hour and the service', () => {
		const draft = new BookingDraft();
		draft.enter('maria', hints);
		expect(draft.doctorSlug).toBe('maria');
		expect(draft.slot).toEqual({ officeId: 'off-a', date: '2026-11-08', startMinute: 570 });
		expect(draft.serviceId).toBe('svc-simple');
		expect(draft.slotServiceId).toBe('svc-simple');
	});

	it('🔴 U-112.2: back from a «Αλλαγή» to the same address — the draft speaks (the hour saved since, the note, the visitor)', () => {
		const draft = new BookingDraft();
		draft.enter('maria', hints);
		draft.note = 'Πόνος στο γόνατο';
		draft.visitor = { kind: 'relative', relativeId: 'rel-1' };
		draft.chooseSlot({ officeId: 'off-b', date: '2026-11-09', startMinute: 600 }, 'svc-simple');
		draft.enter('maria', hints);
		expect(draft.slot).toEqual({ officeId: 'off-b', date: '2026-11-09', startMinute: 600 });
		expect(draft.note).toBe('Πόνος στο γόνατο');
		expect(draft.visitor).toEqual({ kind: 'relative', relativeId: 'rel-1' });
	});

	it('another hour from the doctor’s page — the address speaks for the hour; the person’s words stay', () => {
		const draft = new BookingDraft();
		draft.enter('maria', hints);
		draft.note = 'Σημείωση';
		draft.enter('maria', { ...hints, time: '10:00' });
		expect(draft.slot?.startMinute).toBe(600);
		expect(draft.serviceId).toBe('svc-simple');
		expect(draft.note).toBe('Σημείωση');
	});

	it('(negative) another doctor starts a new booking: nothing of the last one stays', () => {
		const draft = new BookingDraft();
		draft.enter('maria', hints);
		draft.note = 'Για την κυρία Τριανταφύλλου';
		draft.firstVisit = 'no';
		draft.phoneDestination = '+30 69•• ••• 412';
		draft.enter('nikos', { office: 'n-1', date: '2026-11-10', time: '11:30' });
		expect(draft.note).toBe('');
		expect(draft.firstVisit).toBe('yes');
		expect(draft.phoneDestination).toBeNull();
		expect(draft.visitor).toEqual({ kind: 'self' });
		expect(draft.slot).toEqual({ officeId: 'n-1', date: '2026-11-10', startMinute: 690 });
		expect(draft.serviceId).toBeNull();
	});

	it('(negative) an address without an hour keeps the draft’s hour; `forget` leaves nothing', () => {
		const draft = new BookingDraft();
		draft.enter('maria', hints);
		draft.enter('maria', { service: 'svc-full' });
		expect(draft.slot?.startMinute).toBe(570);
		expect(draft.serviceId).toBe('svc-full');
		draft.forget();
		expect([draft.doctorSlug, draft.slot, draft.serviceId, draft.note, draft.syncedHints]).toEqual([
			null,
			null,
			null,
			'',
			null
		]);
	});

	it('U-65.6 (negative): what a person types stays as text, never cut or made markup here', () => {
		const draft = new BookingDraft();
		const hostile = '<img src=x onerror="alert(1)"></textarea>\u0000';
		draft.note = hostile;
		expect(draft.note).toBe(hostile);
	});
});
