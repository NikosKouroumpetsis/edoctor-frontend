import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$shared/lib/http';
import {
	confirmDeletion,
	deletionPreviewQuery,
	mapDeletionCodeSent,
	mapDeletionPreview,
	previewDeletion,
	readDeletionFailure,
	startDeletion
} from '.';

/*
 * Wave 4.5 · screen 62 (D-W45-30): the three calls of «Διαγραφή λογαριασμού» on the server's existing routes
 * (`auth/account-deletion/me`, `/start`, `/confirm`), every answer and every refusal. Made-up values.
 */

const PREVIEW = {
	allowed: true,
	refusal: null,
	codeChannel: 'email',
	codeDestinationMasked: 'e***a@example.gr',
	removed: [
		{ item: 'ratings', count: 3 },
		{ item: 'relatives', count: 2 },
		{ item: 'questions', count: 0 }
	],
	warnings: ['MESSAGES_COPY_BEFORE_DELETION'],
	retained: [
		{ category: 'LEGAL_ACCEPTANCE', purpose: 'LEGAL_CLAIMS_EVIDENCE', maxRetentionYears: 5 }
	]
};

const answering = (data: unknown, status = 200) =>
	vi.fn(
		async () => new Response(JSON.stringify({ status: 'success', message: '', data }), { status })
	);
const refusing = (status: number, errorCode?: string) =>
	vi.fn(async () => new Response(JSON.stringify({ errorCode }), { status }));
const callOf = (spy: ReturnType<typeof vi.fn>) =>
	spy.mock.calls[0] as unknown as [string, RequestInit];
const refusal = (status: number, errorCode?: string) =>
	new ApiError('refused', status, 'https://api.test/x', errorCode);

afterEach(() => vi.unstubAllGlobals());

describe('account::api::deletion · the preview', () => {
	it('`GET /auth/account-deletion/me` with the cookies, never cached; the answer as facts, in the server’s order and with its own codes', async () => {
		const spy = answering(PREVIEW);
		vi.stubGlobal('fetch', spy);
		await expect(previewDeletion()).resolves.toEqual(PREVIEW);
		const [url, init] = callOf(spy);
		expect(url).toMatch(/\/auth\/account-deletion\/me$/u);
		expect(init).toMatchObject({ method: 'GET', credentials: 'include', cache: 'no-store' });
		expect(init.body).toBeUndefined();
	});

	it('🔴 U-65.6: the read is personal (gone at a sign-out), asked again each time and kept nowhere after the page', () => {
		expect(deletionPreviewQuery()).toMatchObject({
			queryKey: ['account', 'deletion-preview'],
			meta: { personal: true },
			staleTime: 0,
			gcTime: 0,
			retry: false
		});
	});

	it('a refused account: `allowed` false with the server’s reason, no channel and no destination', () => {
		expect(
			mapDeletionPreview({
				...PREVIEW,
				allowed: false,
				refusal: 'BACKOFFICE_ACCOUNT',
				codeChannel: null,
				codeDestinationMasked: null
			})
		).toMatchObject({
			allowed: false,
			refusal: 'BACKOFFICE_ACCOUNT',
			codeChannel: null,
			codeDestinationMasked: null
		});
	});

	it('🔴 U-65.6 (negative): the destination is kept ONLY when it is a mask — a whole address or number, markup, or a far too long value is none', () => {
		for (const value of [
			'eleni.private@example.gr',
			'+306971234567',
			'<img src=x onerror=alert(1)>',
			`e***${'a'.repeat(200)}@example.gr`,
			42,
			{ mask: '***' },
			''
		]) {
			expect(
				mapDeletionPreview({ ...PREVIEW, codeDestinationMasked: value })?.codeDestinationMasked,
				String(value)
			).toBeNull();
		}
		expect(
			mapDeletionPreview({ ...PREVIEW, codeDestinationMasked: '+30 69•• ••• 678' })
				?.codeDestinationMasked
		).toBe('+30 69•• ••• 678');
	});

	it('W-4 (negative): an answer that does not say whether the deletion is allowed is no preview; a row whose code or number is not one is dropped, never guessed', async () => {
		for (const data of [null, [], 'x', 7, {}, { ...PREVIEW, allowed: 'yes' }]) {
			expect(mapDeletionPreview(data), JSON.stringify(data)).toBeNull();
		}
		expect(
			mapDeletionPreview({
				allowed: true,
				refusal: '<b>x</b>',
				codeChannel: 'pigeon',
				codeDestinationMasked: null,
				removed: [
					{ item: 'ratings', count: 2 },
					{ item: 'ratings', count: -1 },
					{ item: 'ratings', count: 1.5 },
					{ item: 'ratings', count: '3' },
					{ item: '<script>', count: 1 },
					{ item: '__proto__x'.repeat(10), count: 1 },
					{ count: 4 },
					null,
					'ratings'
				],
				warnings: ['LICENSE_LOST', 7, '<i>', null, 'a b'],
				retained: [
					{ category: 'DELETION_TRACE', purpose: 'DELETION_ACCOUNTABILITY', maxRetentionYears: 5 },
					{ category: 'DELETION_TRACE', purpose: 'DELETION_ACCOUNTABILITY', maxRetentionYears: -1 },
					{
						category: 'DELETION_TRACE',
						purpose: 'DELETION_ACCOUNTABILITY',
						maxRetentionYears: 1000
					},
					{ category: 'DELETION_TRACE', maxRetentionYears: 5 },
					{ purpose: 'DELETION_ACCOUNTABILITY', maxRetentionYears: 5 },
					7
				]
			})
		).toEqual({
			allowed: true,
			refusal: null,
			codeChannel: null,
			codeDestinationMasked: null,
			removed: [{ item: 'ratings', count: 2 }],
			warnings: ['LICENSE_LOST'],
			retained: [
				{ category: 'DELETION_TRACE', purpose: 'DELETION_ACCOUNTABILITY', maxRetentionYears: 5 }
			]
		});
		expect(mapDeletionPreview({ allowed: true })).toMatchObject({
			removed: [],
			warnings: [],
			retained: []
		});
		// A list far longer than any real one is cut, never drawn whole.
		expect(
			mapDeletionPreview({
				allowed: true,
				removed: Array.from({ length: 5000 }, () => ({ item: 'ratings', count: 1 }))
			})?.removed
		).toHaveLength(100);
		// The read fails on an answer that is no preview: the page says so, it never draws an empty one.
		vi.stubGlobal('fetch', answering({ nothing: true }));
		await expect(previewDeletion()).rejects.toBeInstanceOf(ApiError);
	});

	it('a `401` of the session gate, or no answer at all, reaches the caller as it is', async () => {
		vi.stubGlobal('fetch', refusing(401, 'EC401'));
		await expect(previewDeletion()).rejects.toMatchObject({ status: 401, errorCode: 'EC401' });
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new TypeError('offline');
			})
		);
		await expect(previewDeletion()).rejects.toMatchObject({ status: 0 });
	});
});

describe('account::api::deletion · the code and the deletion', () => {
	it('🔴 the send: `POST …/start` with an EMPTY body by contract — nothing names an account or an address — and only the channel is read of the answer', async () => {
		const spy = answering({ channel: 'phone', destination: '+306971234567' });
		vi.stubGlobal('fetch', spy);
		await expect(startDeletion()).resolves.toEqual({ channel: 'phone' });
		const [url, init] = callOf(spy);
		expect(url).toMatch(/\/auth\/account-deletion\/me\/start$/u);
		expect(init).toMatchObject({ method: 'POST', credentials: 'include' });
		expect(JSON.parse(String(init.body))).toEqual({});
		for (const data of [null, {}, { channel: 'pigeon' }, 'email']) {
			expect(mapDeletionCodeSent(data), JSON.stringify(data)).toBeNull();
		}
	});

	it('🔴 U-65.6: ο κωδικός δεν μπαίνει ποτέ σε διεύθυνση — the confirm sends the code in the BODY of `POST …/confirm`, the address has no query and no code; nothing of the answer is returned', async () => {
		const spy = answering({ tenantUserId: 'u-1', deletedAt: '2026-11-12T10:00:00.000Z' });
		vi.stubGlobal('fetch', spy);
		await expect(confirmDeletion('482913')).resolves.toBeUndefined();
		const [url, init] = callOf(spy);
		expect(url).toMatch(/\/auth\/account-deletion\/me\/confirm$/u);
		expect(url).not.toContain('482913');
		expect(url).not.toMatch(/[?#]/u);
		expect(init).toMatchObject({ method: 'POST', credentials: 'include', cache: 'no-store' });
		expect(JSON.parse(String(init.body))).toEqual({ code: '482913' });
	});

	it('the confirm gives up when its signal does (an answer that never comes)', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(
				(_url: string, init: RequestInit) =>
					new Promise((_resolve, reject) =>
						init.signal?.addEventListener('abort', () =>
							reject(new DOMException('aborted', 'AbortError'))
						)
					)
			)
		);
		const wait = new AbortController();
		const pending = confirmDeletion('482913', wait.signal);
		wait.abort();
		await expect(pending).rejects.toMatchObject({ status: 0 });
	});

	it.each([
		['the session gate’s refusal: the session is gone', refusal(401, 'EC401'), 'session-ended'],
		[
			'an account with no verified channel (a `401` too)',
			refusal(401, 'SIGN_IN_NOT_AVAILABLE'),
			'no-channel'
		],
		['an administration account', refusal(403, 'EC403'), 'backoffice'],
		['a wrong code (a `401` too)', refusal(401, 'EC011'), 'invalid-code'],
		['a wrong code, the other spelling', refusal(401, 'EC010'), 'invalid-code'],
		['an expired code', refusal(401, 'EC007'), 'stale-code'],
		['a code already used', refusal(401, 'EC009'), 'stale-code'],
		['too many wrong codes: locked', refusal(429, 'USER_LOCKED'), 'locked'],
		['locked, the other spelling', refusal(401, 'EC008'), 'locked'],
		['too many sends or tries', refusal(429), 'rate-limited'],
		['too many, with a code this build does not know', refusal(429, 'EC999'), 'rate-limited'],
		['no answer', refusal(0), 'unreachable'],
		['an outage', refusal(503), 'unreachable'],
		['a `401` with no code says nothing', refusal(401), 'unknown'],
		['a `403` of another kind', refusal(403, 'EC999'), 'unknown'],
		['a `422`', refusal(422, 'EC000'), 'unknown']
	] as const)('the refusal read by the server’s own code — %s', (_label, error, kind) => {
		expect(readDeletionFailure(error)).toBe(kind);
	});

	it('(negative) what is no refusal of the server — a thrown value, `null`, a text — is «unknown», never a throw', () => {
		for (const error of [
			new Error('boom'),
			null,
			undefined,
			'EC401',
			{ status: 401, errorCode: 'EC401' }
		]) {
			expect(readDeletionFailure(error)).toBe('unknown');
		}
	});

	it('a refused send or confirm reaches the caller with its status and code', async () => {
		vi.stubGlobal('fetch', refusing(429));
		await expect(startDeletion()).rejects.toMatchObject({ status: 429 });
		vi.stubGlobal('fetch', refusing(401, 'EC011'));
		await expect(confirmDeletion('000000')).rejects.toMatchObject({
			status: 401,
			errorCode: 'EC011'
		});
	});
});
