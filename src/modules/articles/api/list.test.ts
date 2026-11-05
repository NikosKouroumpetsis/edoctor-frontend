import { describe, expect, it, vi } from 'vitest';
import {
	ARTICLES_PAGE_LIMIT,
	fetchArticlesPage,
	isServiceId,
	loadArticlesFirstPage,
	mapArticleSuggestions,
	normalizeArticleSearch
} from './list';

const envelope = (data: unknown, meta?: unknown) =>
	new Response(
		JSON.stringify({ status: 'success', data, ...(meta === undefined ? {} : { meta }) }),
		{
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		}
	);

const slugs = (count: number) =>
	Array.from({ length: count }, (_, n) => ({
		id: `a${n}`,
		slug: `arthro-${n}`,
		title: `Άρθρο ${n}`
	}));

describe('articles::api::list', () => {
	it('U-57.3: the words and the service go to the backend only as it takes them (1–100 characters, a uuid)', async () => {
		const fetchImpl = vi.fn(async () => envelope(slugs(2), { total: 2, appliedService: null }));
		await fetchArticlesPage(
			{
				lang: 'el',
				type: 'HEALTH_ADVICE',
				q: 'νερο',
				serviceId: '0199a0a0-0000-7000-8000-000000000001'
			},
			{ fetch: fetchImpl as unknown as typeof fetch }
		);
		const url = new URL(String((fetchImpl.mock.calls[0] as unknown[])[0]));
		expect(Object.fromEntries(url.searchParams)).toEqual({
			lang: 'el',
			limit: String(ARTICLES_PAGE_LIMIT),
			type: 'HEALTH_ADVICE',
			q: 'νερο',
			serviceId: '0199a0a0-0000-7000-8000-000000000001'
		});
		expect(normalizeArticleSearch('   ')).toBeNull();
		expect(normalizeArticleSearch(` ${'α'.repeat(120)} `)).toHaveLength(100);
		expect(isServiceId('0199a0a0-0000-7000-8000-000000000001')).toBe(true);
		expect(isServiceId('diatrofiki')).toBe(false);
	});

	it('U-57.3: the page keeps the backend’s `meta` — the total and the applied service — and the next cursor when full', async () => {
		const service = {
			id: '0199a0a0-0000-7000-8000-000000000001',
			name: 'Διατροφική συμβουλευτική'
		};
		const fetchImpl = vi.fn(async () =>
			envelope(slugs(ARTICLES_PAGE_LIMIT), { total: 14, appliedService: service })
		);
		const page = await fetchArticlesPage(
			{ lang: 'el', type: null, q: null, serviceId: service.id },
			{ fetch: fetchImpl as unknown as typeof fetch }
		);
		expect(page.total).toBe(14);
		expect(page.appliedService).toEqual(service);
		expect(page.nextCursor).toBe(`arthro-${ARTICLES_PAGE_LIMIT - 1}`);
	});

	it('U-57.3 (negative): an older backend without `meta` (or a malformed one) gives no total and no service — never a guess', async () => {
		for (const meta of [undefined, null, { total: '3', appliedService: { id: 1, name: '' } }]) {
			const fetchImpl = vi.fn(async () => envelope(slugs(1), meta));
			const page = await fetchArticlesPage(
				{ lang: 'el', type: null, q: null, serviceId: null },
				{ fetch: fetchImpl as unknown as typeof fetch }
			);
			expect(page).toMatchObject({ total: null, appliedService: null, nextCursor: null });
		}
	});

	it('U-57.2: the server’s first page never throws — a failed read is `failed`', async () => {
		const fetchImpl = vi.fn(async () => new Response('nope', { status: 503 }));
		await expect(
			loadArticlesFirstPage(fetchImpl as unknown as typeof fetch, {
				lang: 'el',
				type: null,
				q: 'καρδια',
				serviceId: null
			})
		).resolves.toEqual({ state: 'failed' });
	});

	it('U-57.3: the suggestions are adapted tolerantly — a partial entry is left out, never a throw', () => {
		expect(
			mapArticleSuggestions({
				services: [
					{ id: 's1', name: 'Καρδιολογικός έλεγχος', count: 1 },
					{ id: 2, name: 'x' },
					null
				],
				articles: [
					{
						slug: 'kardia',
						title: 'Υγεία της καρδιάς',
						type: 'ARTICLE',
						imageUrl: null,
						excerpt: 'Πέντε συνήθειες',
						serviceNames: ['Καρδιολογικός έλεγχος', 3]
					},
					{ slug: '', title: 'χωρίς slug' }
				]
			})
		).toEqual({
			services: [{ id: 's1', name: 'Καρδιολογικός έλεγχος', count: 1 }],
			articles: [
				{
					slug: 'kardia',
					title: 'Υγεία της καρδιάς',
					type: 'ARTICLE',
					imageUrl: null,
					excerpt: 'Πέντε συνήθειες',
					serviceNames: ['Καρδιολογικός έλεγχος']
				}
			]
		});
		expect(mapArticleSuggestions(undefined)).toEqual({ services: [], articles: [] });
	});

	it('U-77.1, U-92.3: one doctor’s row asks three cards with `doctorId`, and a full row says there is more', async () => {
		const fetchImpl = vi.fn(async () => envelope(slugs(3), { total: 6, appliedService: null }));
		const page = await fetchArticlesPage(
			{ lang: 'el', type: null, q: null, serviceId: null, doctorId: 'doc-1', limit: 3 },
			{ fetch: fetchImpl as unknown as typeof fetch }
		);
		const asked = new URL(String((fetchImpl.mock.calls[0] as unknown[])[0]));
		expect(asked.searchParams.get('doctorId')).toBe('doc-1');
		expect(asked.searchParams.get('limit')).toBe('3');
		expect(page.total).toBe(6);
		expect(page.nextCursor).toBe('arthro-2');
	});

	it('U-77.1 (negative): the site’s list never sends a `doctorId`', async () => {
		const fetchImpl = vi.fn(async () => envelope(slugs(1)));
		await fetchArticlesPage(
			{ lang: 'el', type: null, q: null, serviceId: null },
			{ fetch: fetchImpl as unknown as typeof fetch }
		);
		const asked = new URL(String((fetchImpl.mock.calls[0] as unknown[])[0]));
		expect(asked.searchParams.has('doctorId')).toBe(false);
	});
});
