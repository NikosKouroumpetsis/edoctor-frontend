import type { DoctorArticlesPageView, DoctorArticleView } from './types';

type SampleRow = DoctorArticlesPageView['items'][number];
type SampleAnswer = { status: number; data?: unknown; body?: unknown };
type SampleCall = { method: string; path: string; query: Record<string, string>; body: unknown };

/** Tests only: the pixels of the made-up upload's large size. */
const LARGE_ACROSS = 1200;
const LARGE_DOWN = 800;

/** Tests only: server ids of the made-up articles, `…0b01`, `…0b02`, … */
export const sampleArticleId = (index: number) =>
	`0193d000-0000-7000-8000-000000000b${String(index).padStart(2, '0')}`;
/** Tests only: server ids of the made-up uploads of a text, `…0e01`, … */
export const sampleArticleImageId = (index: number) =>
	`0193d000-0000-7000-8000-000000000e${String(index).padStart(2, '0')}`;

/** One row of «Τα άρθρα μου» as the wire writes it (`ArticleDoctorListItemView`). Made-up words. */
export function sampleArticleRow(index: number, input: Partial<SampleRow> = {}): SampleRow {
	return {
		id: sampleArticleId(index),
		status: 'DRAFT',
		type: 'ARTICLE',
		title: `Άρθρο ${index}`,
		imageUrl: null,
		createdAt: '2026-11-10T09:00:00.000Z',
		updatedAt: '2026-11-10T09:00:00.000Z',
		submittedAt: null,
		publishedAt: null,
		rejectedAt: null,
		rejectionReason: null,
		hasPendingRevision: false,
		revision: null,
		...input
	};
}

/** The five rows of the prototype (`sw.js` `AR`): every state, a change waiting, a refusal with its reason. */
export function sampleArticleRows(): SampleRow[] {
	return [
		sampleArticleRow(2, {
			status: 'PUBLISHED',
			type: 'HEALTH_ADVICE',
			title: 'Άσκηση μετά από έμφραγμα: από πού να ξεκινήσετε',
			imageUrl: 'https://cdn.seed.edoctor.test/articles/a2.webp',
			publishedAt: '2026-10-12T09:00:00.000Z',
			submittedAt: '2026-11-13T09:00:00.000Z',
			hasPendingRevision: true,
			revision: {
				status: 'IN_REVIEW',
				submittedAt: '2026-11-13T09:00:00.000Z',
				rejectedAt: null,
				rejectionReason: null
			}
		}),
		sampleArticleRow(3, {
			status: 'IN_REVIEW',
			title: 'Ταχυπαλμία μετά τον καφέ: πότε είναι επικίνδυνη',
			imageUrl: 'https://cdn.seed.edoctor.test/articles/a3.webp',
			submittedAt: '2026-11-12T09:00:00.000Z'
		}),
		sampleArticleRow(5, {
			title: 'Holter ρυθμού: τι να περιμένετε',
			updatedAt: '2026-11-10T09:00:00.000Z'
		}),
		sampleArticleRow(4, {
			status: 'REJECTED',
			title: 'Χοληστερίνη: διατροφή και φάρμακα',
			imageUrl: 'https://cdn.seed.edoctor.test/articles/a4.webp',
			rejectedAt: '2026-11-09T09:00:00.000Z',
			rejectionReason: 'Γράφει συγκεκριμένη δόση φαρμάκου.'
		}),
		sampleArticleRow(1, {
			status: 'PUBLISHED',
			title: 'Υπέρταση: πότε να ανησυχήσετε',
			imageUrl: 'https://cdn.seed.edoctor.test/articles/a1.webp',
			publishedAt: '2026-11-03T09:00:00.000Z'
		})
	];
}

/** One article with every field of its page (`ArticleDoctorView`), as the wire writes it. Made-up words. */
export function sampleArticle(
	index: number,
	input: Partial<DoctorArticleView> = {}
): DoctorArticleView {
	const row = sampleArticleRow(index);
	return {
		id: row.id,
		publicSlug: null,
		status: row.status,
		type: row.type,
		title: row.title,
		shortDescription: 'Δύο γραμμές για τον ασθενή.',
		content: {
			type: 'doc',
			content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Πρώτη παράγραφος.' }] }]
		},
		contentImages: [],
		image: null,
		readingMinutes: 1,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		submittedAt: null,
		publishedAt: null,
		revisedAt: null,
		rejectedAt: null,
		rejectionReason: null,
		hasPendingRevision: false,
		revision: null,
		...input
	};
}

/**
 * Tests only: «Τα άρθρα μου» in memory — the list page after page by a cursor, one article, the four writes, the
 * deletion and the upload of an image, each answered as the server would (403 for an id it does not know, D-107).
 * `articles` overrides what `GET …/<id>` answers for an id (its content, its cover, its uploads).
 */
export function sampleArticlesServer(
	start: {
		rows?: SampleRow[];
		pageSize?: number;
		articles?: Record<string, Partial<DoctorArticleView>>;
	} = {}
) {
	let rows: SampleRow[] = [...(start.rows ?? sampleArticleRows())];
	const calls: SampleCall[] = [];
	const planted: { method: string; ending: string; answer: SampleAnswer }[] = [];
	const pageSize = start.pageSize ?? 20;

	const reply = ({ status, data, body }: SampleAnswer) =>
		new Response(
			JSON.stringify(
				body ?? { status: status < 400 ? 'success' : 'error', message: '', data: data ?? null }
			),
			{ status }
		);
	const refusal = (status: number, errorMessage: string, details?: unknown): SampleAnswer => ({
		status,
		body: { errorCode: `EC${status}`, errorMessage, ...(details ? { details } : {}) }
	});
	const forbidden = () => refusal(403, 'Forbidden: article is not accessible to this account.');

	function page(query: Record<string, string>): SampleAnswer {
		const limit = Math.min(Number(query.limit ?? pageSize), pageSize);
		const from = query.cursor ? Number(query.cursor) : 0;
		const items = rows.slice(from, from + limit);
		const next = from + limit < rows.length ? String(from + limit) : null;
		return { status: 200, data: { items, nextCursor: next, total: rows.length } };
	}

	async function fetchStub(input: string | URL | Request, init?: RequestInit): Promise<Response> {
		const url = new URL(input instanceof Request ? input.url : String(input));
		const method = init?.method ?? 'GET';
		const path = url.pathname.replace(/^.*\/api\/v\d+/u, '');
		const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
		const query = Object.fromEntries(url.searchParams);
		calls.push({ method, path, query, body });
		const index = planted.findIndex(
			(entry) => entry.method === method && path.endsWith(entry.ending)
		);
		if (index >= 0) return reply(planted.splice(index, 1)[0].answer);
		const ARTICLES = '/article/me/articles';
		if (method === 'GET' && path === ARTICLES) return reply(page(query));
		if (method === 'POST' && path === `${ARTICLES}/images`)
			return reply({
				status: 200,
				data: {
					id: sampleArticleImageId(1),
					smSizeUrl: 'https://cdn.seed.edoctor.test/articles/content/small/e1.webp',
					mediumSizeUrl: 'https://cdn.seed.edoctor.test/articles/content/medium/e1.webp',
					lgSizeUrl: 'https://cdn.seed.edoctor.test/articles/content/large/e1.webp',
					width: LARGE_ACROSS,
					height: LARGE_DOWN
				}
			});
		// The four writes: a new article (a draft or sent), or one of the doctor's (its draft, or sent / its change sent).
		const written = (row: SampleRow, send: boolean): SampleAnswer => {
			const title = typeof body?.title === 'string' ? body.title : row.title;
			const next: SampleRow = {
				...row,
				title,
				type: body?.type ?? row.type,
				...(send
					? row.status === 'PUBLISHED'
						? { hasPendingRevision: true }
						: { status: 'IN_REVIEW', submittedAt: '2026-11-14T10:40:00.000Z' }
					: { status: 'DRAFT' })
			};
			rows = [next, ...rows.filter((kept) => kept.id !== row.id)];
			return { status: 200, data: sampleArticle(0, { ...next, content: body?.content ?? null }) };
		};
		if (method === 'POST' && (path === ARTICLES || path === `${ARTICLES}/submission`))
			return reply(written(sampleArticleRow(90), path.endsWith('/submission')));
		const sent = new RegExp(`^${ARTICLES}/([^/]+)/submission$`, 'u').exec(path);
		if (method === 'POST' && sent) {
			const found = rows.find((row) => row.id === decodeURIComponent(sent[1]));
			return reply(found ? written(found, true) : forbidden());
		}
		const one = new RegExp(`^${ARTICLES}/([^/]+)$`, 'u').exec(path);
		if (one) {
			const id = decodeURIComponent(one[1]);
			const found = rows.find((row) => row.id === id);
			if (!found) return reply(forbidden());
			if (method === 'GET')
				return reply({
					status: 200,
					data: sampleArticle(0, { ...found, ...(start.articles?.[id] ?? {}) })
				});
			if (method === 'PUT') return reply(written(found, false));
			if (method === 'DELETE') {
				rows = rows.filter((row) => row.id !== id);
				return reply({ status: 200, data: { id } });
			}
		}
		return reply(refusal(404, 'Resource not found'));
	}

	return {
		fetch: fetchStub,
		calls,
		/** The writes the server took or refused, in order. */
		writes: () => calls.filter((call) => call.method !== 'GET'),
		rows: () => rows,
		refuse(
			method: string,
			ending: string,
			status: number,
			errorMessage = 'Refused',
			details?: unknown
		) {
			planted.push({ method, ending, answer: refusal(status, errorMessage, details) });
		},
		plant(method: string, ending: string, answer: SampleAnswer) {
			planted.push({ method, ending, answer });
		}
	};
}
