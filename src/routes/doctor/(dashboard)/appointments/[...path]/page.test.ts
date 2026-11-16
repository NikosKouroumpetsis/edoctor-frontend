import { describe, expect, it } from 'vitest';
import { load } from './+page';

const OFFICE = '0193d000-0000-7000-8000-0000000000f2';

const run = (path: string, search = '') =>
	load({
		params: { path },
		url: new URL(`http://localhost/doctor/appointments/${path}${search}`)
	} as never);

function thrown(call: () => unknown): { status?: number } {
	try {
		call();
	} catch (error) {
		return error as { status?: number };
	}
	return {};
}

describe('routes/doctor/(dashboard)/appointments/[...path] load (D-W51-31, screen 67; D-W51-36, screen 68; D-W51-46, screen 69)', () => {
	it('D-W51-31: `/doctor/appointments` is the list — «Επερχόμενα» by default, every office', () => {
		expect(run('')).toEqual({ address: { view: 'list', tab: 'upcoming', officeId: null } });
	});

	it('D-W51-29: `?tab=requests|upcoming|history` is the pill, `?office=<id>` the office', () => {
		for (const tab of ['requests', 'upcoming', 'history']) {
			expect(run('', `?tab=${tab}`), tab).toEqual({
				address: { view: 'list', tab, officeId: null }
			});
		}
		expect(run('', `?tab=history&office=${OFFICE}`)).toEqual({
			address: { view: 'list', tab: 'history', officeId: OFFICE }
		});
	});

	it('U-65.6 (negative): a pill out of the three is «Επερχόμενα»; an office that is no server id is every office', () => {
		for (const search of ['?tab=Requests', '?tab=', '?tab=%3Cscript%3E', '?tab=today', '?x=1']) {
			expect(run('', search), search).toEqual({
				address: { view: 'list', tab: 'upcoming', officeId: null }
			});
		}
		for (const office of ['1', '<script>', `${OFFICE}x`, '../x', '', 'all']) {
			expect(run('', `?office=${encodeURIComponent(office)}`), office).toEqual({
				address: { view: 'list', tab: 'upcoming', officeId: null }
			});
		}
	});

	// The address of `/<id>` carries `step: null` since D-W51-46 (card w51-w5): the appointment itself, no step screen.
	it('🔴 D-W51-36: `/<id>` is screen 68 — the appointment, with the list’s pill and office kept for the list beside it', () => {
		const ID = '0193d000-0000-7000-8000-000000000001';
		expect(run(ID)).toEqual({
			address: {
				view: 'appointment',
				appointmentId: ID,
				step: null,
				tab: 'upcoming',
				officeId: null
			}
		});
		expect(run(ID, `?tab=requests&office=${OFFICE}`)).toEqual({
			address: {
				view: 'appointment',
				appointmentId: ID,
				step: null,
				tab: 'requests',
				officeId: OFFICE
			}
		});
	});

	it('🔴 D-W51-46: `/<id>/reject` and `/<id>/cancel` are screen 69 — the pill and office kept', () => {
		const ID = '0193d000-0000-7000-8000-000000000001';
		expect(run(`${ID}/reject`, '?tab=requests')).toEqual({
			address: {
				view: 'appointment',
				appointmentId: ID,
				step: 'reject',
				tab: 'requests',
				officeId: null
			}
		});
		expect(run(`${ID}/cancel`, `?office=${OFFICE}`)).toEqual({
			address: {
				view: 'appointment',
				appointmentId: ID,
				step: 'cancel',
				tab: 'upcoming',
				officeId: OFFICE
			}
		});
	});

	it('🔴 D-W51-62 · U-102: διόρθωση = οθόνη — `/<id>/correction` is screen 71, the pill and office kept', () => {
		const ID = '0193d000-0000-7000-8000-000000000001';
		expect(run(`${ID}/correction`, `?tab=history&office=${OFFICE}`)).toMatchObject({
			address: {
				view: 'appointment',
				appointmentId: ID,
				step: 'correction',
				tab: 'history',
				officeId: OFFICE
			}
		});
	});

	it('🔴 D-W51-51 · D-W51-52: `/<id>/time` and `/<id>/services` are screen 70 — the pill and office kept', () => {
		const ID = '0193d000-0000-7000-8000-000000000001';
		expect(run(`${ID}/time`, '?tab=requests')).toMatchObject({
			address: { view: 'appointment', appointmentId: ID, step: 'time', tab: 'requests' }
		});
		expect(run(`${ID}/services`, `?office=${OFFICE}`)).toMatchObject({
			address: { view: 'appointment', appointmentId: ID, step: 'services', officeId: OFFICE }
		});
	});

	// Rewrites «anything but the list is a 404 at step 3 — an id (68 comes with step 4)»: D-W51-36 opens one id level;
	// then «`<id>/reject` is a 404» of step 4: D-W51-46 opens `<id>/reject|cancel` (card w51-w5); then D-W51-51 (step 6,
	// card w51-w6) opens `<id>/time|services`; then D-W51-62 (step 7, card w51-w7) opens `<id>/correction` — and only
	// those five words.
	it('🔴 D-W51-69: `/doctor/appointments/new` is screen 72 — from «Ραντεβού» by default (its pill and office), from «Σήμερα» with `?from=today`, a patient chosen with `?kind=&id=`', () => {
		expect(run('new')).toEqual({
			address: { view: 'new', patient: null, from: 'list', tab: 'upcoming', officeId: null }
		});
		expect(run('new', `?tab=requests&office=${OFFICE}`)).toEqual({
			address: { view: 'new', patient: null, from: 'list', tab: 'requests', officeId: OFFICE }
		});
		expect(run('new', '?from=today')).toMatchObject({ address: { view: 'new', from: 'today' } });
		for (const kind of ['account', 'relative', 'record']) {
			expect(run('new', `?kind=${kind}&id=${OFFICE}`), kind).toMatchObject({
				address: { view: 'new', patient: { kind, id: OFFICE } }
			});
		}
	});

	it('D-W51-69 / U-65.6 (negative): a patient of another word or no server id is none; another origin is the list; `new` deeper is a 404', () => {
		for (const search of [
			`?kind=Account&id=${OFFICE}`,
			`?kind=patient&id=${OFFICE}`,
			'?kind=account&id=1',
			'?kind=account&id=%3Cscript%3E',
			`?id=${OFFICE}`,
			'?kind=record'
		]) {
			expect(run('new', search), search).toMatchObject({ address: { view: 'new', patient: null } });
		}
		for (const search of ['?from=Today', '?from=menu', '?from=']) {
			expect(run('new', search), search).toMatchObject({ address: { view: 'new', from: 'list' } });
		}
		for (const path of ['new/x', 'NEW', 'new/', 'new/time']) {
			expect(
				thrown(() => run(path)),
				path
			).toMatchObject({ status: 404 });
		}
	});

	// Rewrites «… `new` is a 404» of steps 4–7 (the list of words below): D-W51-69 (step 8, card w51-w8) makes `new` screen
	// 72 — every other word stays a 404.
	it('D-W51-36 · D-W51-46 · D-W51-51 · D-W51-62 / U-65.6 (negative): anything but the list, `new`, one server id or its five step words is a 404 — a word, a slash, deeper, a very long value', () => {
		for (const path of [
			'0193d000-0000-7000-8000-000000000001/outcome',
			'0193d000-0000-7000-8000-000000000001/correction/x',
			'0193d000-0000-7000-8000-000000000001/CORRECTION',
			'0193d000-0000-7000-8000-000000000001/move',
			'0193d000-0000-7000-8000-000000000001/charges',
			'0193d000-0000-7000-8000-000000000001/time/x',
			'0193d000-0000-7000-8000-000000000001/SERVICES',
			'0193d000-0000-7000-8000-000000000001/reject/x',
			'0193d000-0000-7000-8000-000000000001/REJECT',
			'0193d000-0000-7000-8000-000000000001/',
			'0193d000-0000-7000-8000-00000000000z',
			'requests',
			'history',
			'/',
			'../menu',
			'<script>',
			'a'.repeat(4096)
		]) {
			expect(
				thrown(() => run(path)),
				path.slice(0, 40)
			).toMatchObject({ status: 404 });
		}
	});
});
