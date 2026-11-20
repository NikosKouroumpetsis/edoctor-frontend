import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$shared/lib/http';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import {
	deleteDoctorProfileImage,
	doctorProfileImagesQuery,
	getDoctorProfileImages,
	mapDoctorProfileImage,
	mapDoctorProfileImages,
	readDoctorPhotoFailure,
	reorderDoctorProfileImages,
	replaceDoctorProfileImage,
	uploadDoctorProfileImage
} from '.';
import {
	SAMPLE_PHOTO_IDS,
	samplePhotoServer,
	samplePhotoView,
	samplePhotoViews
} from './images.sample';

/*
 * Wave 5.2 · screen 78 (D-W52-28 … 36): the photos' answers read field by field, the writes as the contract wants them,
 * the server's refusals in the page's reasons. A made-up doctor only.
 */

const API = 'http://localhost:8080';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('the photos of the doctor’s page, read from the server (D-W52-36)', () => {
	it('🔴 D-W52-36: one image field by field — its id, the two sizes a page draws as addresses of the API’s host, the server’s words by language', () => {
		expect(mapDoctorProfileImage(samplePhotoView(2))).toEqual({
			id: SAMPLE_PHOTO_IDS[1],
			mediumUrl: `${API}/uploads/doctor/profile/images/medium/2.webp`,
			largeUrl: `${API}/uploads/doctor/profile/images/large/2.webp`,
			alt: { el: 'Ελένη Παππά, φωτογραφία 2', en: 'Eleni Pappa, photo 2' }
		});
		// A storage's own address stays as it is.
		expect(
			mapDoctorProfileImage(
				samplePhotoView(1, { mediumSizeUrl: 'https://files.example/medium/1.webp' })
			)?.mediumUrl
		).toBe('https://files.example/medium/1.webp');
	});

	it('🔴 D-W52-31: the list keeps the server’s order — the first is the main one — whatever `priority` says', () => {
		const views = [samplePhotoView(3), samplePhotoView(1), samplePhotoView(2)];
		expect(mapDoctorProfileImages(views)?.map((image) => image.id)).toEqual([
			SAMPLE_PHOTO_IDS[2],
			SAMPLE_PHOTO_IDS[0],
			SAMPLE_PHOTO_IDS[1]
		]);
		expect(mapDoctorProfileImages([])).toEqual([]);
	});

	it('🔴 U-65.6 (negative): an answer that is no list is a failed read; an entry that is no image, or an id met twice, is left out; a list past its bound is cut', () => {
		for (const broken of [null, undefined, {}, 'x', 5, { data: [] }]) {
			expect(mapDoctorProfileImages(broken), String(broken)).toBeNull();
		}
		const views = [
			samplePhotoView(1),
			null,
			'x',
			{ ...samplePhotoView(2), id: 'not-an-id' },
			{ ...samplePhotoView(2), id: undefined },
			samplePhotoView(1),
			samplePhotoView(3)
		];
		expect(mapDoctorProfileImages(views)?.map((image) => image.id)).toEqual([
			SAMPLE_PHOTO_IDS[0],
			SAMPLE_PHOTO_IDS[2]
		]);
		const many = Array.from({ length: 150 }, (_, index) => samplePhotoView(index + 10));
		expect(mapDoctorProfileImages(many)).toHaveLength(100);
	});

	it('🔴 U-65.6 (negative): an address that is no address is none — another scheme, script, another host’s `//`, spaces, no text, a text too long; the image itself stays (it can still be deleted)', () => {
		for (const address of [
			'javascript:alert(1)',
			'data:text/html,<script>alert(1)</script>',
			'//evil.example/x.webp',
			'ftp://files.example/x.webp',
			'uploads/x.webp',
			'/uploads/a b.webp',
			'http://',
			'',
			'   ',
			null,
			5,
			`/uploads/${'a'.repeat(2100)}.webp`
		]) {
			const image = mapDoctorProfileImage(
				samplePhotoView(1, { mediumSizeUrl: address as string, lgSizeUrl: address as string })
			);
			expect(image, String(address)).toMatchObject({
				id: SAMPLE_PHOTO_IDS[0],
				mediumUrl: null,
				largeUrl: null
			});
		}
	});

	it('🔴 U-65.6 (negative): the words are plain text of the server’s bound, or none — a missing language, a null, a number, 201 characters', () => {
		const image = mapDoctorProfileImage(
			samplePhotoView(1, {
				translations: [
					{ id: 'a', language: 'el', alt: '<img src=x onerror=alert(1)>', metaDescription: null },
					{ id: 'b', language: 'en', alt: 'a'.repeat(201), metaDescription: null }
				]
			})
		);
		// Kept as TEXT (the page writes it in an attribute and a text node, never as HTML); the long one is none.
		expect(image?.alt).toEqual({ el: '<img src=x onerror=alert(1)>', en: null });
		for (const translations of [undefined, null, [], [{ language: 'el', alt: null }], 'x']) {
			expect(
				mapDoctorProfileImage(samplePhotoView(1, { translations: translations as never }))?.alt
			).toEqual({ el: null, en: null });
		}
	});

	it('🔴 U-65.6 · D-W52-36: the read asks for the doctor of the session — the cookies, no doctor in the address — and lives under the profile’s root (a write of a section reads it again)', async () => {
		const server = samplePhotoServer();
		const spy = vi.fn(server.fetch);
		vi.stubGlobal('fetch', spy);
		const images = await getDoctorProfileImages();
		expect(images).toHaveLength(4);
		const [address, init] = spy.mock.calls[0] as [string, RequestInit];
		expect(new URL(address).pathname).toMatch(/\/doctor\/profile\/images$/u);
		expect(new URL(address).search).toBe('');
		expect(init).toMatchObject({ method: 'GET', credentials: 'include', cache: 'no-store' });
		const key = doctorProfileImagesQuery().queryKey;
		expect(key).toEqual(['doctor-dashboard', 'profile', 'images']);
		expect(key.slice(0, 2)).toEqual(doctorDashboardQueryKeys.profile());
	});

	it('🔴 U-65.6 (negative): the query fails on an answer that is no list, and does not ask again after a refusal', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(JSON.stringify({ status: 'success', data: { no: 'list' } })))
		);
		const options = doctorProfileImagesQuery();
		await expect(
			(options.queryFn as (context: { signal?: AbortSignal }) => Promise<unknown>)({})
		).rejects.toBeInstanceOf(ApiError);
		const retry = options.retry as (failures: number, error: unknown) => boolean;
		for (const status of [401, 403, 404]) {
			expect(retry(0, new ApiError('x', status, '/doctor/profile/images'))).toBe(false);
		}
		expect(retry(0, new ApiError('x', 500, '/doctor/profile/images'))).toBe(true);
		expect(retry(1, new ApiError('x', 500, '/doctor/profile/images'))).toBe(false);
	});
});

describe('the writes of the photos, as the contract wants them (D-W52-28 … 35)', () => {
	const serving = () => {
		const server = samplePhotoServer();
		vi.stubGlobal('fetch', vi.fn(server.fetch));
		vi.stubGlobal('XMLHttpRequest', server.Upload);
		return server;
	};

	it('🔴 D-W52-28 · D-W52-33: a new photo is the file as a `data:` text inside the JSON and a name made of its type — never the person’s file name, never words or a position (the server writes them)', async () => {
		const server = serving();
		const seen: number[] = [];
		const write = uploadDoctorProfileImage('data:image/png;base64,AAAA', {
			onProgress: (fraction) => seen.push(fraction)
		});
		const sent = server.sending();
		expect(sent).toMatchObject({ method: 'POST', path: '/doctor/profile/images' });
		expect(sent?.body).toEqual({
			image: { file: 'data:image/png;base64,AAAA', fileName: 'photo.png' }
		});
		sent?.progress(1, 4);
		sent?.store();
		const stored = await write;
		expect(seen).toEqual([0.25]);
		expect(stored?.id).toBe(server.ids().at(-1));
		expect(stored?.alt.el).toBe('Ελένη Παππά, φωτογραφία 5');

		for (const [file, name] of [
			['data:image/jpeg;base64,AAAA', 'photo.jpg'],
			['data:image/webp;base64,AAAA', 'photo.webp'],
			['data:image/gif;base64,AAAA', undefined],
			['not a data text', undefined]
		] as const) {
			void uploadDoctorProfileImage(file).catch(() => {});
			expect(server.sending()?.body.image?.fileName, file).toBe(name);
			server.sending()?.refuse(422);
		}
	});

	it('🔴 D-W52-35: «Προσαρμογή» sends the cut to the photo’s own address (`PATCH`) — the same id comes back with new addresses', async () => {
		const server = serving();
		const write = replaceDoctorProfileImage(SAMPLE_PHOTO_IDS[1], 'data:image/jpeg;base64,CUT');
		expect(server.sending()).toMatchObject({
			method: 'PATCH',
			path: `/doctor/profile/images/${SAMPLE_PHOTO_IDS[1]}`,
			body: { image: { file: 'data:image/jpeg;base64,CUT', fileName: 'photo.jpg' } }
		});
		server.sending()?.store();
		const saved = await write;
		expect(saved?.id).toBe(SAMPLE_PHOTO_IDS[1]);
		expect(saved?.largeUrl).toMatch(/\/large\/cut-\d+\.webp$/u);
	});

	it('🔴 D-W52-31: the order is ONE call with every id once — and the list the server keeps comes back; a deletion names the photo in its address and sends an empty body', async () => {
		const server = serving();
		const [a, b, c, d] = SAMPLE_PHOTO_IDS;
		const list = await reorderDoctorProfileImages([c, a, b, d]);
		expect(server.callsOf('PUT')).toEqual([
			['/doctor/profile/images/order', { imageIds: [c, a, b, d] }]
		]);
		expect(list?.map((image) => image.id)).toEqual([c, a, b, d]);
		expect(list?.[0].alt.el).toBe('Ελένη Παππά, φωτογραφία 1');
		await deleteDoctorProfileImage(c);
		expect(server.callsOf('DELETE')).toEqual([[`/doctor/profile/images/${c}`, {}]]);
		expect(server.ids()).toEqual([a, b, d]);
	});

	it('🔴 D-W52-29 / 30 / 31 (`w52-b2` §8): the server’s refusals in the page’s reasons — by status, by the code at the end of its message, by its own words for the weight and the type', () => {
		const refusal = (status: number, message = 'x', code?: string) =>
			readDoctorPhotoFailure(new ApiError(message, status, '/doctor/profile/images', code));
		expect(refusal(409, 'Already exist: DOCTOR_IMAGE_LIMIT_REACHED', 'EC415')).toBe('limit');
		expect(refusal(422, 'Validation Error: IMAGE_TOO_SMALL', 'EC422')).toBe('small');
		expect(refusal(422, 'Validation Error: file size exceeds 10485760 bytes.', 'EC422')).toBe(
			'large'
		);
		expect(refusal(413, 'Request body is too large', 'PAYLOAD_TOO_LARGE')).toBe('large');
		for (const words of [
			'Validation Error: file mimeType "image/gif" is not allowed.',
			'Validation Error: file type is not supported.',
			'Validation Error: file mimeType mismatch between name and content.'
		]) {
			expect(refusal(422, words, 'EC422'), words).toBe('type');
		}
		expect(refusal(422, 'Validation Error: DOCTOR_IMAGE_ORDER_MISMATCH', 'EC422')).toBe('gone');
		expect(refusal(404, 'Resource not found', 'EC404')).toBe('gone');
		expect(refusal(401)).toBe('session');
		expect(refusal(403, 'Forbidden: Doctor licence is required before profile changes')).toBe(
			'forbidden'
		);
		expect(refusal(429, 'Too many requests. Please try again later.')).toBe('rate-limited');
	});

	it('(negative) D-W52-38: a refusal nobody named — a schema error, another `409`, a lost request, an error that is none of the API’s — is `unknown`, never a made-up reason', () => {
		const refusal = (status: number, message = 'x') =>
			readDoctorPhotoFailure(new ApiError(message, status, '/doctor/profile/images'));
		expect(refusal(422, 'Schema Validation Error: imageIds must NOT have more than 20 items')).toBe(
			'unknown'
		);
		expect(refusal(409, 'Already exist')).toBe('unknown');
		expect(refusal(500)).toBe('unknown');
		expect(refusal(0, 'Network request failed')).toBe('unknown');
		expect(readDoctorPhotoFailure(new Error('IMAGE_TOO_SMALL'))).toBe('unknown');
		expect(readDoctorPhotoFailure(null)).toBe('unknown');
	});

	it('the sample server keeps the list as `w52-b2` describes it (so the page specs stand on the contract’s shapes)', async () => {
		const server = serving();
		expect(mapDoctorProfileImages(samplePhotoViews(2))).toHaveLength(2);
		server.refuse('GET', '/doctor/profile/images', 500);
		await expect(getDoctorProfileImages()).rejects.toMatchObject({ status: 500 });
		await expect(getDoctorProfileImages()).resolves.toHaveLength(4);
	});
});
