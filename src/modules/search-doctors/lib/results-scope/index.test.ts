import { describe, expect, it } from 'vitest';
import { readResultsPress, readResultsScope } from '.';

const CARDIOLOGY =
	'what=Καρδιολόγος&whatKind=professional&whatId=p1&whatSlug=kardiologos&whatLabel=Καρδιολόγος';
const NEAR_ME = 'where=Κοντά μου&whereKind=current-location&whereLabel=Κοντά μου';
const here = { latitude: 37.98, longitude: 23.73 };

// 🔴 U-32.1: the results' address is read here (the route's load and the presses), the api reads the scope it gets.
describe('search-doctors::lib::results-scope', () => {
	it('U-32.1: the scope of an address — its criteria and filters by the results’ readers; «Κοντά μου» with the visit’s position', () => {
		expect(
			readResultsScope(new URLSearchParams(`${CARDIOLOGY}&gender=FEMALE`), null)
		).toMatchObject({
			what: { kind: 'professional', professionalId: 'p1', professionalSlug: 'kardiologos' },
			filters: { gender: 'FEMALE' }
		});
		expect(readResultsScope(new URLSearchParams(NEAR_ME), here)?.where).toEqual({
			kind: 'geo',
			lat: 37.98,
			lng: 23.73
		});
	});

	it('U-32.1 (negative, S-32.2 web): «Κοντά μου» without a position is no scope — never the default Αττική; an old link’s coordinates are not one', () => {
		expect(readResultsScope(new URLSearchParams(NEAR_ME), null)).toBeNull();
		expect(
			readResultsScope(new URLSearchParams(`${NEAR_ME}&whereLat=37.943&whereLng=23.647`), null)
		).toBeNull();
	});

	it('U-32.1: a press — the scope it goes to, and the page’s own only when it is the page shown', () => {
		const shown = new URL(`http://localhost/doctors?${CARDIOLOGY}`);
		const same = readResultsPress(`/doctors?${CARDIOLOGY}`, null, shown);
		expect(same.shown).toEqual(same.scope);
		expect(
			readResultsPress(`/doctors?${CARDIOLOGY}`, null, new URL('http://localhost/')).shown
		).toBeNull();
		expect(readResultsPress('/doctors', null).scope).toMatchObject({ what: { kind: 'default' } });
		expect(readResultsPress(`/doctors?${NEAR_ME}`, null)).toEqual({ scope: null, shown: null });
	});
});
