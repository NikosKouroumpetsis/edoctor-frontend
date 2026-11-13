import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';
import { ApiError } from '$shared/lib/http';
import { personalQueryMeta } from '$shared/query';
import {
	accountPersonQuery,
	mapAccountPerson,
	readAccountWriteFailure,
	updateAccountBirthDate,
	updateAccountGender
} from '.';

afterEach(() => vi.unstubAllGlobals());

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), { status });
const sent = (spy: ReturnType<typeof vi.fn>) =>
	spy.mock.calls[0] as unknown as [string, RequestInit];

describe('modules/profile/api/user · screen 58’s gender and date of birth (`GET` / `PUT /user/me`)', () => {
	it('maps the gender as the contract spells it and the DAY of birth; none for an account that names none or has no profile yet', () => {
		expect(
			mapAccountPerson({ gender: 'FEMALE', dateOfBirth: '1988-03-14T00:00:00.000Z', locale: 'el' })
		).toEqual({ gender: 'FEMALE', birthDate: '1988-03-14' });
		expect(mapAccountPerson({ gender: 'OTHER_GENE', dateOfBirth: '2001-12-31' })).toEqual({
			gender: 'OTHER_GENE',
			birthDate: '2001-12-31'
		});
		expect(mapAccountPerson({ gender: null, dateOfBirth: null })).toEqual({
			gender: null,
			birthDate: null
		});
		expect(mapAccountPerson(null)).toEqual({ gender: null, birthDate: null });
	});

	it('W-4 (negative): another word, another type, a date that is none, markup or a list read as none — never a throw, never free text kept', () => {
		for (const view of [
			{ gender: 'female', dateOfBirth: '14/03/1988' },
			{ gender: 'ROBOT', dateOfBirth: 19880314 },
			{ gender: ['FEMALE'], dateOfBirth: '<b>1988-03-14</b>' },
			{ gender: '<script>', dateOfBirth: '1988-03-14x' },
			[{ gender: 'FEMALE' }],
			'FEMALE',
			7,
			undefined
		]) {
			expect(mapAccountPerson(view), JSON.stringify(view)).toEqual({
				gender: null,
				birthDate: null
			});
		}
	});

	it('🔴 U-169: of the whole profile only the gender and the day of birth reach the cache, under the module’s root and the sign-out’s mark', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () =>
				json({
					id: 'u-1',
					tenantUserId: 't-1',
					gender: 'MALE',
					dateOfBirth: '1990-01-02T00:00:00.000Z',
					avatarUrl: 'https://cdn.example.test/a.png',
					headline: 'κάτι',
					bio: 'κείμενο',
					locale: 'en'
				})
			)
		);
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const options = accountPersonQuery();
		expect(options.queryKey).toEqual(['profile', 'account-person']);
		expect(options.meta).toBe(personalQueryMeta);
		expect(await client.fetchQuery(options)).toEqual({ gender: 'MALE', birthDate: '1990-01-02' });
		const kept = JSON.stringify(
			client
				.getQueryCache()
				.getAll()
				.map((query) => query.state.data)
		);
		expect(kept).not.toMatch(/u-1|t-1|cdn\.example|κάτι|κείμενο|"en"/u);
	});

	it('«Φύλο»: the write is a `PUT /user/me` with the cookies and `gender` ALONE; the date of birth of an account without a patient profile the same way', async () => {
		const gender = vi.fn(async () => json({ id: 'u-1', gender: 'MALE' }));
		vi.stubGlobal('fetch', gender);
		await expect(updateAccountGender('MALE')).resolves.toBeUndefined();
		const [url, init] = sent(gender);
		expect(new URL(url, 'https://api.test').pathname).toMatch(/\/user\/me$/u);
		expect(new URL(url, 'https://api.test').search).toBe('');
		expect(init).toMatchObject({ method: 'PUT', credentials: 'include' });
		expect(JSON.parse(String(init.body))).toEqual({ gender: 'MALE' });

		const birth = vi.fn(async () => json({ id: 'u-1' }));
		vi.stubGlobal('fetch', birth);
		await updateAccountBirthDate('1990-01-02T00:00:00.000Z');
		expect(JSON.parse(String(sent(birth)[1].body))).toEqual({
			dateOfBirth: '1990-01-02T00:00:00.000Z'
		});
	});

	it('reads a refused write: the session, the date of birth the `422` names, another field, else', () => {
		const refusal = (status: number, message = 'refused') =>
			new ApiError(message, status, '/user/me');
		expect(readAccountWriteFailure(refusal(401))).toBe('session');
		expect(readAccountWriteFailure(refusal(422, '"dateOfBirth" must be less than now'))).toBe(
			'birth-date'
		);
		expect(readAccountWriteFailure(refusal(422, 'nothing to change'))).toBe('invalid');
		expect(readAccountWriteFailure(refusal(400))).toBe('invalid');
		expect(readAccountWriteFailure(refusal(503))).toBe('unknown');
		expect(readAccountWriteFailure(new TypeError('offline'))).toBe('unknown');
	});
});
