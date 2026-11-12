import { describe, expect, it } from 'vitest';
import { load } from './+page';

const ID = '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5b';

const run = (path: string, search = '') =>
	load({
		params: { path },
		url: new URL(`http://localhost/appointments/${path}${search}`)
	} as never);

function thrown(call: () => unknown): { status?: number } {
	try {
		call();
	} catch (error) {
		return error as { status?: number };
	}
	return {};
}

describe('routes/appointments/[...path] load (D-W4-20, D-W4-51, P-W4 §3.1)', () => {
	it('D-W4-20: «Τα ραντεβού μου», an appointment and the five screens it opens, the application’s words', () => {
		expect(run('')).toEqual({ address: { view: 'list', tab: 'upcoming' } });
		expect(run(ID)).toEqual({ address: { view: 'appointment', appointmentId: ID, step: null } });
		for (const step of ['time', 'for-whom', 'relative', 'note', 'cancel']) {
			expect(run(`${ID}/${step}`), step).toEqual({
				address: { view: 'appointment', appointmentId: ID, step }
			});
		}
	});

	it('P-W4 §3.1: `?tab=history` is the list’s «Ιστορικό»; any other tab is «Επερχόμενα»; an appointment takes none from the address (§3.2)', () => {
		expect(run('', '?tab=history')).toEqual({ address: { view: 'list', tab: 'history' } });
		for (const search of [
			'?tab=upcoming',
			'?tab=History',
			'?tab=',
			'?tab=%3Cscript%3E',
			'?other=1'
		]) {
			expect(run('', search), search).toEqual({ address: { view: 'list', tab: 'upcoming' } });
		}
		expect(run(ID, '?tab=history')).toEqual({
			address: { view: 'appointment', appointmentId: ID, step: null }
		});
	});

	it('D-W4-20 / U-65.6 (negative): anything out of the list is a 404 — no id, a step out of the list or one level too deep, a path out, a trailing slash, a very long value', () => {
		for (const path of [
			'list',
			'history',
			'1',
			'<script>',
			`${ID}x`,
			ID.toUpperCase().replace('A', 'G'),
			`${ID}/`,
			`${ID}/reschedule`,
			`${ID}/Time`,
			`${ID}/time/again`,
			`${ID}/cancel/x`,
			`/${ID}`,
			`../${ID}`,
			`${ID}/../time`,
			`${ID}/..`,
			`${'a'.repeat(4096)}`,
			'time'
		]) {
			expect(
				thrown(() => run(path)),
				path
			).toMatchObject({ status: 404 });
		}
	});

	it('review w4-w1 R1 NIT-4: the router hands the load a DECODED rest (`decodeURIComponent`, SvelteKit 2.59 `utils/url.js:55-63`) — an encoded slash is an alias of the same closed list, never free text', () => {
		const decoded = (raw: string) => run(decodeURIComponent(raw));
		expect(decoded(`${ID}%2Ftime`)).toEqual(run(`${ID}/time`));
		expect(decoded(`${ID}%2Ftime`)).toEqual({
			address: { view: 'appointment', appointmentId: ID, step: 'time' }
		});
		for (const raw of [`${ID}/%2E%2E`, `${ID}%2Freschedule`, `${ID}%2Ftime%2Fagain`]) {
			expect(
				thrown(() => decoded(raw)),
				raw
			).toMatchObject({ status: 404 });
		}
	});
});
