import { afterEach, describe, expect, it, vi } from 'vitest';

// The row's scope and search: stand-ins, never the network.
const { buildSectionQuery, searchDoctors } = vi.hoisted(() => ({
	buildSectionQuery: vi.fn(),
	searchDoctors: vi.fn()
}));
vi.mock('$modules/search-doctors/api/marketplace/build-section-query', () => ({
	buildSectionQuery
}));
vi.mock('$modules/search-doctors/api/marketplace/endpoints', () => ({ searchDoctors }));

import { loadHomeSections } from './load';

const serverFetch = vi.fn() as unknown as typeof fetch;
const link = { availability: 'next7Days', what: null, where: null };

/** A wire card the adapter reads (the contract's shape). */
const wireCard = {
	doctorId: 'd1',
	slug: 'dr-1',
	fullName: 'Γιατρός 1',
	professional: { id: 'p', name: 'Καρδιολόγος', slug: 'kardiologos' },
	primaryOffice: null,
	primaryImage: null,
	images: [],
	descriptionExcerpt: null,
	rating: { average: 4.8, count: 12 },
	availability: { nextAvailableAt: null, hasToday: true, hasNext3Days: true, hasNext7Days: true },
	priceRange: null,
	primaryServicePrice: null
};

/** Every unhandled rejection while `run` and the next turns of the loop go (the server's crash of 22:35). */
async function unhandledDuring(run: () => Promise<unknown>): Promise<unknown[]> {
	const rejections: unknown[] = [];
	const record = (reason: unknown) => rejections.push(reason);
	process.on('unhandledRejection', record);
	try {
		await run();
		await new Promise((resolve) => setTimeout(resolve, 10));
	} finally {
		process.off('unhandledRejection', record);
	}
	return rejections;
}

afterEach(() => {
	buildSectionQuery.mockReset();
	searchDoctors.mockReset();
});

// 🔴 U-32.9 (the orchestrator's live measure, 29/10 22:35: the dev server fell on «Unhandled rejection» when the mapper
// threw inside `.then(onOk, onErr)`): a streamed row's promise NEVER rejects.
describe('search-doctors::api::home::loadHomeSections', () => {
	it('U-32.9: a card the mapper cannot read (a backend card of another shape) makes its row the error — the promise resolves, nothing rejects', async () => {
		buildSectionQuery.mockResolvedValue({ params: { lang: 'el' }, link });
		searchDoctors.mockResolvedValue({ items: [{ doctorId: 'odd' }], pricingVisible: false });
		const rejections = await unhandledDuring(async () => {
			const sections = await loadHomeSections(serverFetch, 'el');
			expect(sections).toHaveLength(3);
			for (const section of sections) {
				await expect(section.result).resolves.toEqual({ status: 'error' });
			}
		});
		expect(rejections).toEqual([]);
	});

	it('U-32.9: the usual way is as before — the cards’ facts and the link; a failed search or scope is the error', async () => {
		buildSectionQuery
			.mockResolvedValueOnce({ params: { lang: 'el' }, link })
			.mockResolvedValueOnce({ params: { lang: 'el' }, link })
			.mockRejectedValueOnce(new Error('suggestions down'));
		searchDoctors
			.mockResolvedValueOnce({ items: [wireCard], pricingVisible: false })
			.mockRejectedValueOnce(new Error('search down'));
		const rejections = await unhandledDuring(async () => {
			const [ok, failed, scopeless] = await loadHomeSections(serverFetch, 'el');
			await expect(ok.result).resolves.toMatchObject({
				status: 'ok',
				link,
				items: [{ id: 'd1', name: 'Γιατρός 1', professionalName: 'Καρδιολόγος', reviewCount: 12 }]
			});
			await expect(failed.result).resolves.toEqual({ status: 'error' });
			await expect(scopeless.result).resolves.toEqual({ status: 'error' });
		});
		expect(searchDoctors).toHaveBeenCalledTimes(2);
		expect(searchDoctors.mock.calls[0][1]).toEqual({ fetch: serverFetch });
		expect(rejections).toEqual([]);
	});

	// Documented, no mutation (D-110): the chain's former shape, the one the server fell on.
	it('U-32.9 (negative): `.then(onOk, onErr)` rejects when `onOk` itself throws; the closed chain `.then(onOk).catch(…)` does not', async () => {
		const mapperThrows = (): never => {
			throw new TypeError('mapCardToDoctor is not a function');
		};
		const former = Promise.resolve({ items: [] }).then(mapperThrows, () => ({ status: 'error' }));
		await expect(former).rejects.toThrow('mapCardToDoctor is not a function');
		const closed = Promise.resolve({ items: [] })
			.then(mapperThrows)
			.catch(() => ({ status: 'error' }));
		await expect(closed).resolves.toEqual({ status: 'error' });
	});
});
