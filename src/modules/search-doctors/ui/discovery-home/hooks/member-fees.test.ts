import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/svelte';
import type { Component } from 'svelte';
import { focusManager, onlineManager } from '@tanstack/svelte-query';
import QueryHarness from '$shared/query/query.harness.svelte';
import type { DoctorCard, StreamedHomeRow } from '$modules/search-doctors/types';
import Harness from './member-fees.harness.svelte';
import CategoryHarness from './member-sections.harness.svelte';

// The rows' reads: the search itself is a stand-in that records how it was asked.
const { searchDoctors, resolveSpecialtyScope } = vi.hoisted(() => ({
	searchDoctors: vi.fn(),
	resolveSpecialtyScope: vi.fn(async () => ({ textFallback: 'Παθολόγος' }))
}));
vi.mock('$modules/search-doctors/api/marketplace/endpoints', async (importOriginal) => ({
	...(await importOriginal<typeof import('$modules/search-doctors/api/marketplace/endpoints')>()),
	searchDoctors
}));
vi.mock('$modules/search-doctors/api/marketplace/resolvers', async (importOriginal) => ({
	...(await importOriginal<typeof import('$modules/search-doctors/api/marketplace/resolvers')>()),
	resolveSpecialtyScope,
	resolveLocationSlug: async () => ({ locationSlug: 'athina', label: 'Αθήνα' })
}));

const guestCard: DoctorCard = {
	id: 'doc-1',
	doctorSlug: 'doc-1',
	name: 'Α',
	specialty: 'Παθολόγος',
	area: 'Αθήνα',
	imageUrl: '',
	availabilityLabel: '',
	fee: { kind: 'login', label: 'Συνδεθείτε για κόστος' },
	ratingLabel: '4,9'
};
const rows = (): StreamedHomeRow[] => [
	{
		id: 'internal-medicine-gp',
		result: Promise.resolve({ status: 'ok', doctors: [guestCard], criteria: null })
	} as unknown as StreamedHomeRow
];

const memberAnswer = {
	items: [
		{
			doctorId: 'doc-1',
			slug: 'doc-1',
			fullName: 'Α',
			professional: { name: 'Παθολόγος' },
			availability: { nextAvailableAt: null, hasToday: false, hasNext3Days: false },
			rating: { average: 4.9, count: 3 },
			primaryServicePrice: 60,
			primaryOffice: null
		}
	],
	pricingVisible: true,
	pageInfo: { total: 1, hasNextPage: false, nextCursor: null }
};

function draw(member: boolean, sections = rows()) {
	return render(QueryHarness, {
		props: {
			component: Harness as unknown as Component<never>,
			props: { sections, member }
		}
	});
}

/** The row as the server answers it: its cards and the search it has already resolved. */
const rowWithParams = (params: unknown): StreamedHomeRow[] => [
	{
		id: 'internal-medicine-gp',
		result: Promise.resolve({ status: 'ok', doctors: [guestCard], criteria: null, params })
	} as unknown as StreamedHomeRow
];

describe('the home’s rows and a member’s fees (U-34.4)', () => {
	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it('🔴 a guest: the server’s rows and NO second request', async () => {
		draw(false);
		expect(await screen.findByTestId('fee-doc-1')).toHaveTextContent('Συνδεθείτε για κόστος');
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(searchDoctors).not.toHaveBeenCalled();
	});

	it('🔴 a member: ONE read with the session per row, and the fee takes the words’ place', async () => {
		searchDoctors.mockResolvedValue(memberAnswer);
		draw(true);
		await waitFor(() => expect(searchDoctors).toHaveBeenCalled());
		for (const [, context] of searchDoctors.mock.calls) {
			expect(context).toMatchObject({ withSession: true });
		}
		const row = screen.getByTestId('fee-doc-1');
		await waitFor(() => expect(row).toHaveTextContent('60'));
		const perRow = searchDoctors.mock.calls.length;
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(searchDoctors).toHaveBeenCalledTimes(perRow);
	});

	it('a member’s failed read leaves the words, never an error', async () => {
		searchDoctors.mockRejectedValue(new Error('down'));
		draw(true);
		await waitFor(() => expect(searchDoctors).toHaveBeenCalled());
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(screen.getByTestId('fee-doc-1')).toHaveTextContent('Συνδεθείτε για κόστος');
	});

	it('🔴 U-34.4: a sign-out takes the amount at once, whatever the read still holds', async () => {
		searchDoctors.mockResolvedValue(memberAnswer);
		const sections = rows();
		const component = Harness as unknown as Component<never>;
		const view = render(QueryHarness, {
			props: { component, props: { sections, member: true } }
		});
		const row = await screen.findByTestId('fee-doc-1');
		await waitFor(() => expect(row).toHaveTextContent('60'));
		// `rerender`'s `props` is what it sets: here the harness's own prop of that name.
		await view.rerender({ props: { props: { sections, member: false } } } as never);
		await waitFor(() =>
			expect(screen.getByTestId('fee-doc-1')).toHaveTextContent('Συνδεθείτε για κόστος')
		);
		expect(screen.getByTestId('fee-doc-1')).not.toHaveTextContent('60');
	});

	it('R-7: the row is the search the server resolved: nothing is resolved again, only the cookies are new', async () => {
		searchDoctors.mockResolvedValue(memberAnswer);
		const params = {
			sortBy: 'availability',
			availability: 'any',
			limit: 10,
			lang: 'el',
			text: 'x'
		};
		draw(true, rowWithParams(params));
		await waitFor(() => expect(searchDoctors).toHaveBeenCalledTimes(1));
		expect(searchDoctors.mock.calls[0][0]).toEqual(params);
		expect(searchDoctors.mock.calls[0][1]).toMatchObject({ withSession: true });
		await waitFor(() => expect(screen.getByTestId('fee-doc-1')).toHaveTextContent('60'));
		expect(resolveSpecialtyScope).not.toHaveBeenCalled();
	});

	it('R-7 (negative): a row the server had no search for asks nothing', async () => {
		draw(true, rowWithParams(null));
		expect(await screen.findByTestId('fee-doc-1')).toHaveTextContent('Συνδεθείτε για κόστος');
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(searchDoctors).not.toHaveBeenCalled();
		expect(resolveSpecialtyScope).not.toHaveBeenCalled();
	});

	it('🔴 R-7: ONCE means once: coming back to the tab or to the network past its minute asks nothing', async () => {
		searchDoctors.mockResolvedValue(memberAnswer);
		draw(true);
		await waitFor(() => expect(searchDoctors).toHaveBeenCalled());
		await waitFor(() => expect(screen.getByTestId('fee-doc-1')).toHaveTextContent('60'));
		const reads = searchDoctors.mock.calls.length;
		const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 61_000);
		focusManager.setFocused(false);
		focusManager.setFocused(true);
		onlineManager.setOnline(false);
		onlineManager.setOnline(true);
		await new Promise((resolve) => setTimeout(resolve, 20));
		focusManager.setFocused(undefined);
		clock.mockRestore();
		expect(searchDoctors).toHaveBeenCalledTimes(reads);
	});

	it('🔴 U-34.4: a category’s rows: what a member read never stands in for a guest’s, while the guest’s read is on its way', async () => {
		searchDoctors.mockResolvedValue(memberAnswer);
		const props = { categoryId: 'cardiology', member: true };
		const view = render(QueryHarness, {
			props: { component: CategoryHarness as unknown as Component<never>, props }
		});
		await waitFor(() => expect(screen.getAllByTestId('category-fee')[0]).toHaveTextContent('60'));
		let answer: (value: unknown) => void = () => undefined;
		searchDoctors.mockReturnValue(new Promise((resolve) => (answer = resolve)));
		await view.rerender({ props: { props: { ...props, member: false } } } as never);
		await waitFor(() => expect(screen.queryAllByTestId('category-fee')).toHaveLength(0));
		answer({ ...memberAnswer, pricingVisible: false });
		await waitFor(() =>
			expect(screen.getAllByTestId('category-fee')[0]).toHaveTextContent('Συνδεθείτε για κόστος')
		);
	});
});
