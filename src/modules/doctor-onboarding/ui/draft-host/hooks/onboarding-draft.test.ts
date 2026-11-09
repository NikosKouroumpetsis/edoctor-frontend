import { describe, expect, it } from 'vitest';
import { OnboardingDraft } from './onboarding-draft.svelte';

describe('doctor-onboarding::OnboardingDraft (the overlay of U-112.2)', () => {
	it('U-112.2: holds only what the person changed, part by part — a change adds to the ones before, never replaces the part', () => {
		const draft = new OnboardingDraft();
		expect(draft.edits).toEqual({});
		expect(draft.dirty).toBe(false);
		draft.update('office', { phone: '210 412 3456' });
		draft.update('office', { floor: 3 });
		draft.update('basicInfo', { firstName: 'Ελένη' });
		expect(draft.edits).toEqual({
			office: { phone: '210 412 3456', floor: 3 },
			basicInfo: { firstName: 'Ελένη' }
		});
		expect(draft.dirty).toBe(true);
	});

	it('U-112.2: a screen shows the person’s value over the server’s — even an empty one, or «no place id» (a manual address)', () => {
		const draft = new OnboardingDraft();
		expect(draft.read('basicInfo', 'firstName', 'Νίκος')).toBe('Νίκος');
		draft.update('basicInfo', { firstName: '' });
		expect(draft.read('basicInfo', 'firstName', 'Νίκος')).toBe('');
		draft.update('office', { placeId: null, source: 'manual' });
		expect(draft.read('office', 'placeId', 'ChIJ2d0hA0e9oRQR')).toBeNull();
		expect(draft.read('office', 'phone', '210 000 0000')).toBe('210 000 0000');
	});

	it('U-112.2: after «Επόμενο» the step’s changes go — the whole part, or only that screen’s fields; the rest stays', () => {
		const draft = new OnboardingDraft();
		draft.update('office', { streetLine: 'Καραΐσκου 74', phone: '210 412 3456', floor: 2 });
		draft.update('servicePricing', { price: '50' });
		draft.clear('office', ['phone', 'floor']);
		expect(draft.edits).toEqual({
			office: { streetLine: 'Καραΐσκου 74' },
			servicePricing: { price: '50' }
		});
		draft.clear('office', ['streetLine']);
		expect(draft.edits).toEqual({ servicePricing: { price: '50' } });
		draft.clear('servicePricing');
		draft.clear('calendar');
		expect(draft.edits).toEqual({});
		expect(draft.dirty).toBe(false);
	});

	it('U-112.2 (negative): `forget` leaves nothing of any part', () => {
		const draft = new OnboardingDraft();
		draft.update('salesContact', { salesContactPhone: '6912345678', salesContactRequested: true });
		draft.update('liability', { liabilityCompany: 'Ασφαλιστική' });
		draft.forget();
		expect(draft.edits).toEqual({});
		expect(draft.read('salesContact', 'salesContactPhone', '')).toBe('');
	});

	it('U-65.6 (negative): what a person types is kept as it is, as text — no trimming, no markup made of it, nothing cut here (the server sets the limits)', () => {
		const draft = new OnboardingDraft();
		const hostile = '<img src=x onerror="alert(1)"></textarea>\u0000';
		const long = 'α'.repeat(10_000);
		draft.update('office', { gettingThere: hostile, city: long });
		expect(draft.read('office', 'gettingThere', '')).toBe(hostile);
		expect(draft.read('office', 'city', '')).toHaveLength(10_000);
	});
});
