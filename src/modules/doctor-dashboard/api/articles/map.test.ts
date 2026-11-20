import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$shared/lib/http';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import {
	sampleArticle,
	sampleArticleId,
	sampleArticleImageId,
	sampleArticleRow,
	sampleArticleRows,
	sampleArticlesServer
} from './articles.sample';
import {
	deleteDoctorArticle,
	getDoctorArticle,
	listDoctorArticles,
	uploadDoctorArticleImage,
	writeDoctorArticle
} from './endpoints';
import { readDoctorArticlesFailure } from './failure';
import {
	mapDoctorArticle,
	mapDoctorArticleListItem,
	mapDoctorArticlesPage,
	toDoctorArticleBody
} from './map';

/*
 * Wave 5.2 · screen 85 (D-W52-93 … 101, `w52-b9a` §11, `w52-b9b` §1–§3): the doctor's articles as the contract writes
 * them — read field by field, ONLY what the server gave, and the calls with the cookies, nothing of a doctor, never a
 * slug or an SEO field.
 */

afterEach(() => {
	vi.unstubAllGlobals();
});

function serve(start: Parameters<typeof sampleArticlesServer>[0] = {}) {
	const server = sampleArticlesServer(start);
	const spy = vi.fn(server.fetch);
	vi.stubGlobal('fetch', spy);
	return { server, spy };
}

const DOC = {
	type: 'doc',
	content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Κείμενο.' }] }]
};

describe('api/articles · map (D-W52-96)', () => {
	it('🔴 D-W52-96: one row field by field — state, kind, title, cover, dates; the reason ONLY for a refused one; a change ONLY of a published one', () => {
		const row = mapDoctorArticleListItem(sampleArticleRows()[3]);
		expect(row).toEqual({
			id: sampleArticleId(4),
			status: 'REJECTED',
			kind: 'ARTICLE',
			title: 'Χοληστερίνη: διατροφή και φάρμακα',
			imageUrl: 'https://cdn.seed.edoctor.test/articles/a4.webp',
			createdAt: '2026-11-10T09:00:00.000Z',
			updatedAt: '2026-11-10T09:00:00.000Z',
			submittedAt: null,
			publishedAt: null,
			rejectedAt: '2026-11-09T09:00:00.000Z',
			rejectionReason: 'Γράφει συγκεκριμένη δόση φαρμάκου.',
			hasPendingRevision: false,
			revision: null
		});
		const draft = mapDoctorArticleListItem(
			sampleArticleRow(5, {
				rejectionReason: 'δεν ισχύει',
				hasPendingRevision: true,
				revision: {
					status: 'IN_REVIEW',
					submittedAt: '2026-11-12T09:00:00.000Z',
					rejectedAt: null,
					rejectionReason: null
				}
			})
		);
		expect(draft).toMatchObject({
			rejectionReason: null,
			hasPendingRevision: false,
			revision: null
		});
		const changed = mapDoctorArticleListItem(sampleArticleRows()[0]);
		expect(changed).toMatchObject({
			status: 'PUBLISHED',
			kind: 'HEALTH_ADVICE',
			hasPendingRevision: true,
			revision: { status: 'IN_REVIEW', submittedAt: '2026-11-13T09:00:00.000Z' }
		});
	});

	it('🔴 U-65.6 (negative): an id out of the server’s shape, a state or a kind the contract does not name, a date that is no instant — no row', () => {
		for (const broken of [
			sampleArticleRow(1, { id: '1' }),
			sampleArticleRow(1, { status: 'GONE' as never }),
			sampleArticleRow(1, { type: 'NEWS' as never }),
			sampleArticleRow(1, { createdAt: 'soon' }),
			sampleArticleRow(1, { title: 7 as never }),
			sampleArticleRow(1, {
				status: 'PUBLISHED',
				revision: { status: 'MAYBE', submittedAt: 'x' } as never
			}),
			null,
			'<b>x</b>'
		]) {
			expect(mapDoctorArticleListItem(broken)).toBeNull();
		}
	});

	it('🔴 D-W52-96: a page — ONLY what the server gave: a broken row stays out, each id once, the cursor and the total', () => {
		const rows = sampleArticleRows();
		const page = mapDoctorArticlesPage({
			items: [...rows, rows[0], { id: 'x' }],
			nextCursor: 'abc',
			total: 7
		});
		expect(page?.items.map((item) => item.id)).toEqual(rows.map((row) => row.id));
		expect(page).toMatchObject({ nextCursor: 'abc', total: 7 });
		expect(mapDoctorArticlesPage({ items: [], nextCursor: '', total: -1 })).toEqual({
			items: [],
			nextCursor: null,
			total: 0
		});
		expect(mapDoctorArticlesPage({ items: 'x' })).toBeNull();
	});

	it('🔴 D-W52-99 / 100: one article — its text ONLY as a document of the closed schema, its uploads, its cover, the public slug only while published', () => {
		const article = mapDoctorArticle(
			sampleArticle(1, {
				status: 'PUBLISHED',
				publicSlug: 'ypertasi-0000b01',
				content: DOC as never,
				image: {
					smSizeUrl: 'https://cdn.seed.edoctor.test/c/s.webp',
					mediumSizeUrl: 'https://cdn.seed.edoctor.test/c/m.webp',
					lgSizeUrl: 'https://cdn.seed.edoctor.test/c/l.webp'
				},
				contentImages: [
					{
						id: sampleArticleImageId(1),
						smSizeUrl: 'https://cdn.seed.edoctor.test/i/s.webp',
						mediumSizeUrl: 'https://cdn.seed.edoctor.test/i/m.webp',
						lgSizeUrl: 'https://cdn.seed.edoctor.test/i/l.webp',
						width: 1200,
						height: 800
					},
					{ id: 'x' } as never
				],
				revisedAt: '2026-11-14T09:00:00.000Z'
			})
		);
		expect(article).toMatchObject({
			publicSlug: 'ypertasi-0000b01',
			shortDescription: 'Δύο γραμμές για τον ασθενή.',
			content: DOC,
			cover: 'https://cdn.seed.edoctor.test/c/l.webp',
			contentImages: [
				{
					id: sampleArticleImageId(1),
					url: 'https://cdn.seed.edoctor.test/i/l.webp',
					width: 1200,
					height: 800
				}
			],
			readingMinutes: 1,
			revisedAt: '2026-11-14T09:00:00.000Z'
		});
		// U-222.4 (negative): a text outside the closed list is no text — never drawn as one.
		const html = mapDoctorArticle(
			sampleArticle(1, {
				content: {
					type: 'doc',
					content: [{ type: 'html', content: [{ type: 'text', text: '<script>' }] }]
				} as never
			})
		);
		expect(html?.content).toBeNull();
		// A draft has no public slug even if one came.
		expect(mapDoctorArticle(sampleArticle(1, { publicSlug: 'x' }))?.publicSlug).toBeNull();
	});
});

describe('api/articles · bodies and calls (D-W52-95, U-207.3, U-222.4)', () => {
	it('🔴 D-W52-95 / U-207.3: a write’s body is the whole form in Greek — NEVER a slug, an SEO field, an author or a state; the cover only when it changes', () => {
		const body = toDoctorArticleBody({
			kind: 'HEALTH_ADVICE',
			title: '  Υπέρταση\u0000 ',
			shortDescription: ' ',
			content: DOC as never
		});
		expect(body).toEqual({
			language: 'el',
			type: 'HEALTH_ADVICE',
			title: 'Υπέρταση',
			shortDescription: null,
			content: DOC
		});
		for (const key of [
			'slug',
			'metaTitle',
			'metaDescription',
			'canonicalUrl',
			'readingMinutes',
			'status',
			'authors'
		])
			expect(body).not.toHaveProperty(key);
		expect(
			toDoctorArticleBody({
				kind: 'ARTICLE',
				title: 'α',
				shortDescription: 'β',
				content: null,
				cover: 'data:image/png;base64,AAAA'
			}).image
		).toEqual({ file: 'data:image/png;base64,AAAA', fileName: 'image.png' });
		expect(
			toDoctorArticleBody({
				kind: 'ARTICLE',
				title: 'α',
				shortDescription: 'β',
				content: null,
				cover: null
			}).image
		).toBeNull();
	});

	it('🔴 D-W52-96: the list asks with the cookies and the page’s cursor, nothing of a doctor; the next page by the server’s cursor', async () => {
		const { spy } = serve({ pageSize: 2 });
		const first = await listDoctorArticles({ limit: 20 });
		expect(first?.items).toHaveLength(2);
		expect(first?.nextCursor).toBe('2');
		const [url, init] = spy.mock.calls[0] as [string, RequestInit];
		expect(url).toMatch(/\/article\/me\/articles\?limit=20$/u);
		expect(init.credentials).toBe('include');
		expect(url).not.toMatch(/doctorId/u);
		const second = await listDoctorArticles({ limit: 20, cursor: '2' });
		expect(second?.items.map((item) => item.id)).toEqual([sampleArticleId(5), sampleArticleId(4)]);
	});

	it('🔴 D-W52-95: each write is ONE call of its own — draft (POST / PUT), sending (POST …/submission / POST …/<id>/submission)', async () => {
		const { server } = serve();
		const draft = { kind: 'ARTICLE' as const, title: 'α', shortDescription: 'β', content: null };
		const id = sampleArticleId(5);
		for (const [articleId, write] of [
			[null, 'save'],
			[null, 'send'],
			[id, 'save'],
			[id, 'send']
		] as const) {
			server.plant(
				articleId === null ? 'POST' : write === 'save' ? 'PUT' : 'POST',
				articleId === null
					? write === 'save'
						? 'articles'
						: 'submission'
					: write === 'save'
						? id
						: 'submission',
				{ status: 200, data: sampleArticle(5) }
			);
			expect(await writeDoctorArticle(articleId, write, draft)).toMatchObject({ id });
		}
		expect(server.writes().map((call) => `${call.method} ${call.path}`)).toEqual([
			'POST /article/me/articles',
			'POST /article/me/articles/submission',
			`PUT /article/me/articles/${id}`,
			`POST /article/me/articles/${id}/submission`
		]);
	});

	it('🔴 D-W52-95 / D-W52-100: «Διαγραφή άρθρου» and an image of the text — each one call; the upload carries the file alone, never a person’s file name', async () => {
		const { server } = serve();
		expect(await deleteDoctorArticle(sampleArticleId(5))).toBe(true);
		const image = await uploadDoctorArticleImage('data:image/webp;base64,AAAA');
		expect(image).toEqual({
			id: sampleArticleImageId(1),
			url: 'https://cdn.seed.edoctor.test/articles/content/large/e1.webp',
			width: 1200,
			height: 800
		});
		expect(server.writes().map((call) => [call.method, call.path, call.body])).toEqual([
			['DELETE', `/article/me/articles/${sampleArticleId(5)}`, {}],
			[
				'POST',
				'/article/me/articles/images',
				{ image: { file: 'data:image/webp;base64,AAAA', fileName: 'image.webp' } }
			]
		]);
	});

	it('🔴 D-107 (negative): another doctor’s or an unknown article answers the one 403 — read as «gone»', async () => {
		serve();
		const failure = await getDoctorArticle('0193d000-0000-7000-8000-0000000000ff').catch(
			(error: unknown) => error
		);
		expect(failure).toBeInstanceOf(ApiError);
		expect(readDoctorArticlesFailure(failure)).toBe('gone');
	});

	it('🔴 D-W52-95 / 99 / 100: every refusal read from its status, code and details', () => {
		const error = (status: number, message = '', details?: Record<string, string | number>) =>
			new ApiError(message, status, '/article/me/articles', `EC${status}`, details);
		expect(readDoctorArticlesFailure(error(401))).toBe('session');
		expect(readDoctorArticlesFailure(error(429))).toBe('rate-limited');
		expect(readDoctorArticlesFailure(error(404))).toBe('gone');
		expect(readDoctorArticlesFailure(error(413))).toBe('too-large');
		expect(readDoctorArticlesFailure(error(409, 'ARTICLE_UNPUBLISHED_LIMIT_REACHED'))).toBe(
			'limit'
		);
		expect(readDoctorArticlesFailure(error(409, 'ARTICLE_IMAGE_PENDING_LIMIT_REACHED'))).toBe(
			'images-pending'
		);
		expect(readDoctorArticlesFailure(error(409, 'article changed state since it was read'))).toBe(
			'changed'
		);
		expect(
			readDoctorArticlesFailure(error(422, 'Validation Error', { shortDescription: 'REQUIRED' }))
		).toBe('required');
		expect(
			readDoctorArticlesFailure(
				error(422, 'Validation Error: ARTICLE_CONTENT_REFUSED', { content: 'LINK_NOT_HTTPS' })
			)
		).toBe('content');
		expect(readDoctorArticlesFailure(error(422, 'IMAGE_TOO_SMALL'))).toBe('cover-small');
		expect(readDoctorArticlesFailure(error(422, 'DOCTOR_WRITES_GREEK_ONLY'))).toBe('invalid');
		expect(readDoctorArticlesFailure(new Error('x'))).toBe('unknown');
	});

	it('D-W52-102: the keys live under ONE root, so a write reads the list and the article again', () => {
		const root = doctorDashboardQueryKeys.articles();
		expect(doctorDashboardQueryKeys.articleList().slice(0, root.length)).toEqual(root);
		expect(doctorDashboardQueryKeys.article('a').slice(0, root.length)).toEqual(root);
	});
});
