import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const KEY = 'edoctor.test.doctor-mode.v1';

/** `app.html`'s before-paint script of the doctor standing (the one that reads the doctor-mode key). */
function doctorModeScript(): string {
	const html = readFileSync(join(process.cwd(), 'src/app.html'), 'utf8');
	const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gu)].map((match) => match[1]);
	const script = scripts.find((body) => body.includes('%edoctor.doctor-mode.key%'));
	if (!script) throw new Error('no doctor-mode script in app.html');
	return script.replace('%edoctor.doctor-mode.key%', KEY);
}

/** Runs it as the browser would before the first paint, at `address`, with `stored` as the device's memory. */
function runAt(address: string, stored: unknown) {
	const url = new URL(address, 'https://edoctor.invalid');
	const storage = new Map<string, string>();
	if (stored !== undefined)
		storage.set(KEY, typeof stored === 'string' ? stored : JSON.stringify(stored));
	const replace = vi.fn();
	const root = document.createElement('html');
	const run = new Function('localStorage', 'location', 'document', doctorModeScript());
	run(
		{ getItem: (key: string) => storage.get(key) ?? null },
		{ pathname: url.pathname, search: url.search, hash: url.hash, replace },
		{ documentElement: root }
	);
	return { replace, mode: root.dataset.doctorMode };
}

afterEach(() => vi.restoreAllMocks());

describe('app.html · before the first paint (D-W51-19, 64 «Η μνήμη»)', () => {
	it('a licence of the marketplace marks the page for the bar’s «Λειτουργία γιατρού»', () => {
		expect(runAt('/doctors', { v: 1, kind: 'doctor', lastMode: 'PATIENT' })).toEqual({
			replace: expect.any(Function),
			mode: 'doctor'
		});
		expect(
			runAt('/doctors', { v: 1, kind: 'doctor', lastMode: 'PATIENT' }).replace
		).not.toHaveBeenCalled();
	});

	it('64 «Η μνήμη»: the bare home of one who left in the doctor’s mode opens the doctor’s «Σήμερα», in its language', () => {
		expect(runAt('/', { v: 1, kind: 'doctor', lastMode: 'DOCTOR' }).replace).toHaveBeenCalledWith(
			'/doctor'
		);
		expect(runAt('/en', { v: 1, kind: 'doctor', lastMode: 'DOCTOR' }).replace).toHaveBeenCalledWith(
			'/en/doctor'
		);
		expect(
			runAt('/en/', { v: 1, kind: 'doctor', lastMode: 'DOCTOR' }).replace
		).toHaveBeenCalledWith('/en/doctor');
	});

	it('64 «Η μνήμη» (negative): public pages and a home from a link stay the patient’s', () => {
		for (const address of ['/doctors/dr-x', '/articles', '/?q=καρδιολόγος', '/#top', '/profile']) {
			expect(
				runAt(address, { v: 1, kind: 'doctor', lastMode: 'DOCTOR' }).replace,
				address
			).not.toHaveBeenCalled();
		}
	});

	it('(negative) no memory, another version, another kind, broken JSON: nothing marked, nobody moved', () => {
		for (const stored of [
			undefined,
			{ v: 2, kind: 'doctor', lastMode: 'DOCTOR' },
			{ v: 1, kind: 'pending', lastMode: 'DOCTOR' },
			{ v: 1, kind: 'payments', lastMode: 'DOCTOR' },
			'{broken'
		]) {
			const result = runAt('/', stored);
			expect(result.mode, JSON.stringify(stored)).toBeUndefined();
			expect(result.replace, JSON.stringify(stored)).not.toHaveBeenCalled();
		}
	});
});
