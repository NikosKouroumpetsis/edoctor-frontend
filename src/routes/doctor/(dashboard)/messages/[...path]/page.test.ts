import { describe, expect, it } from 'vitest';
import { load } from './+page';

const ID = '0193d000-0000-7000-8000-0000000000c1';
const PATIENT = '0193d000-0000-7000-8000-0000000000b3';

const run = (path: string, search = '') =>
	load({
		params: { path },
		url: new URL(`http://localhost/doctor/messages/${path}${search}`)
	} as never);

function thrown(call: () => unknown): { status?: number } {
	try {
		call();
	} catch (error) {
		return error as { status?: number };
	}
	return {};
}

describe('routes/doctor/(dashboard)/messages/[...path] load (D-W51-85, screen 74)', () => {
	it('D-W51-85: the list, a conversation, the archive, and a conversation the doctor starts (U-193.1)', () => {
		expect(run('')).toEqual({ address: { view: 'list' } });
		expect(run(ID)).toEqual({ address: { view: 'conversation', conversationId: ID } });
		expect(run('archive')).toEqual({ address: { view: 'archive' } });
		expect(run('new', `?kind=account&id=${PATIENT}`)).toEqual({
			address: { view: 'new', target: { kind: 'account', id: PATIENT } }
		});
		expect(run('new', `?kind=relative&id=${PATIENT}`)).toMatchObject({
			address: { target: { kind: 'relative' } }
		});
	});

	it('🔴 D-W51-85 · D-W51-71 / U-65.6 (negative): anything out of the closed list is a 404 — never a page that reads it', () => {
		for (const [path, search] of [
			['1', ''],
			[`${ID}/x`, ''],
			['archive/x', ''],
			['%3Cscript%3E', ''],
			['new', ''],
			['new', `?kind=record&id=${PATIENT}`],
			['new', `?kind=admin&id=${PATIENT}`],
			['new', '?kind=account&id=../x'],
			['new', '?kind=account&id=a%20b'],
			[`new/${PATIENT}`, '?kind=account']
		]) {
			expect(thrown(() => run(path, search)).status, `${path}${search}`).toBe(404);
		}
	});
});
