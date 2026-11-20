import { describe, expect, it } from 'vitest';
import { load } from './+page';

const ID = '0193d000-0000-7000-8000-0000000000b3';

const run = (path: string) => load({ params: { path } } as never);

function thrown(call: () => unknown): { status?: number } {
	try {
		call();
	} catch (error) {
		return error as { status?: number };
	}
	return {};
}

describe('routes/doctor/(dashboard)/profile/[...path] load (D-W52-23 · D-W52-41, screens 77 and 78)', () => {
	it('🔴 D-W52-41: the list of «Το προφίλ μου», «Φωτογραφίες», and one photo’s «Προσαρμογή»', () => {
		expect(run('')).toEqual({ address: { section: null } });
		expect(run('photos')).toEqual({ address: { section: 'photos', cropId: null } });
		expect(run(`photos/${ID}/crop`)).toEqual({ address: { section: 'photos', cropId: ID } });
	});

	it('🔴 D-W52-49: «Όνομα και περιγραφή» at `about`, and nothing under it', () => {
		expect(run('about')).toEqual({ address: { section: 'about' } });
		for (const path of ['about/edit', 'about/', 'abouts', 'About']) {
			expect(thrown(() => run(path)).status, path).toBe(404);
		}
	});

	it('🔴 D-W52-59: «Ειδικότητα και εξειδικεύσεις» at `specialty`, the choice at `specialty/specializations`, and nothing else under them', () => {
		expect(run('specialty')).toEqual({ address: { section: 'specialty', pick: false } });
		expect(run('specialty/specializations')).toEqual({
			address: { section: 'specialty', pick: true }
		});
		for (const path of [
			'specialty/',
			'specialty/edit',
			'specialty/specializations/',
			'specialty/specializations/PR011-01',
			'specialtys',
			'Specialty',
			'specializations'
		]) {
			expect(thrown(() => run(path)).status, path).toBe(404);
		}
	});

	it('🔴 U-210 · D-W52-63: «Βιογραφικό» at `cv`, one row of it at `cv/<group>/<id>` or `cv/<group>/new`, and nothing else under them', () => {
		expect(run('cv')).toEqual({ address: { section: 'cv', item: null } });
		expect(run('cv/studies/new')).toEqual({
			address: { section: 'cv', item: { kind: 'STUDY', id: null } }
		});
		expect(run(`cv/experience/${ID}`)).toEqual({
			address: { section: 'cv', item: { kind: 'WORK', id: ID } }
		});
		expect(run(`cv/conferences/${ID}`)).toEqual({
			address: { section: 'cv', item: { kind: 'CONFERENCE', id: ID } }
		});
		for (const path of [
			'cv/',
			'cv/new',
			'cv/studies',
			'cv/work/new',
			'cv/WORK/new',
			'cv/experience/1',
			'cv/experience/new/x',
			`cv/experience/${ID}/edit`,
			`cv/${ID}`,
			'cvs',
			'CV',
			'credentials',
			'cv/experience/%3Cscript%3E'
		]) {
			expect(thrown(() => run(path)).status, path).toBe(404);
		}
	});

	it('🔴 U-211 · D-W52-69 / 70: «Γλώσσες και κοινωνικά δίκτυα» at `languages`, the choice of the languages at `languages/spoken`, the four links at `languages/networks`, and nothing else under them', () => {
		expect(run('languages')).toEqual({ address: { section: 'languages', page: null } });
		expect(run('languages/spoken')).toEqual({ address: { section: 'languages', page: 'spoken' } });
		expect(run('languages/networks')).toEqual({
			address: { section: 'languages', page: 'networks' }
		});
		for (const path of [
			'languages/',
			'languages/edit',
			'languages/spoken/',
			'languages/spoken/SL001',
			'languages/networks/facebook',
			'languages/Spoken',
			'Languages',
			'language',
			'spoken',
			'networks',
			'languages/%3Cscript%3E'
		]) {
			expect(thrown(() => run(path)).status, path).toBe(404);
		}
	});

	it('🔴 U-212 · D-W52-81 / 82: «Υπηρεσίες και τιμές» at `services`, one service at `services/<id>`, «Νέα υπηρεσία» at `services/new`, a new one at `services/new/<id>`, and nothing else under them', () => {
		expect(run('services')).toEqual({ address: { section: 'services', page: null } });
		expect(run(`services/${ID}`)).toEqual({
			address: { section: 'services', page: { view: 'service', id: ID } }
		});
		expect(run('services/new')).toEqual({
			address: { section: 'services', page: { view: 'catalogue' } }
		});
		expect(run(`services/new/${ID}`)).toEqual({
			address: { section: 'services', page: { view: 'new', serviceId: ID } }
		});
		for (const path of [
			'services/',
			'services/1',
			`services/${ID}/edit`,
			'services/new/x',
			`services/new/${ID}/x`,
			'Services',
			'service',
			'services/%3Cscript%3E'
		]) {
			expect(thrown(() => run(path)).status, path).toBe(404);
		}
	});

	it('🔴 D-W52-41 / U-65.6 (negative): anything out of the closed list is a 404 — a section without its screen yet, a look-alike, an id that is not the server’s', () => {
		// Widened by D-W52-49 (screen 79): `about` is a page now (the case above).
		// Widened by D-W52-81 (screen 83): `services` is a page now (the case above); a look-alike of it stays a 404.
		for (const path of [
			'servicesx',
			'photosx',
			`photos/${ID}`,
			'photos/1/crop',
			`photos/${ID}/crop/x`,
			`photos/${ID}/delete`,
			'%3Cscript%3E'
		]) {
			expect(thrown(() => run(path)).status, path).toBe(404);
		}
	});
});
