import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/svelte';
import type { Component } from 'svelte';
import QueryHarness from '$shared/query/query.harness.svelte';
import DoctorArticlesRow from './index.svelte';

/** The browser's observer, a stand-in: the test says when the row nears the screen. */
const observers: { fire: (near: boolean) => void; options?: IntersectionObserverInit }[] = [];
class FakeObserver {
	#callback: IntersectionObserverCallback;
	options?: IntersectionObserverInit;
	constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
		this.#callback = callback;
		this.options = options;
		observers.push(this);
	}
	fire(near: boolean) {
		this.#callback(
			[{ isIntersecting: near } as IntersectionObserverEntry],
			this as unknown as IntersectionObserver
		);
	}
	observe() {}
	disconnect() {}
}

const card = (slug: string) => ({
	id: slug,
	slug,
	type: 'ARTICLE',
	title: `Τίτλος ${slug}`,
	shortDescription: null,
	authors: [{ name: 'Dr. Α', isPrimary: true }],
	image: null,
	publishedAt: '2026-07-10T00:00:00Z',
	readingMinutes: 5
});

function stubFetch(answer: () => Response) {
	const fetchImpl = vi.fn(async () => answer());
	vi.stubGlobal('fetch', fetchImpl);
	return fetchImpl;
}

const ok = (data: unknown, meta?: unknown) =>
	new Response(JSON.stringify({ status: 'success', data, meta }), { status: 200 });

function draw(counts: { articlesCount: number; healthAdviceCount: number }) {
	return render(QueryHarness, {
		props: {
			component: DoctorArticlesRow as unknown as Component<never>,
			props: {
				doctorId: 'doc-1',
				counts,
				locale: 'el',
				articleHref: (slug: string) => `/articles/${slug}`,
				allHref: '/doctors/dr-a/articles'
			}
		}
	});
}

describe('the profile’s articles (U-77, U-92)', () => {
	beforeEach(() => {
		observers.length = 0;
		vi.stubGlobal('IntersectionObserver', FakeObserver);
	});
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it('🔴 U-92.2: a doctor without articles: no section, no observer, NO request', async () => {
		const fetchImpl = stubFetch(() => ok([]));
		draw({ articlesCount: 0, healthAdviceCount: 0 });
		await Promise.resolve();
		expect(screen.queryByTestId('doctor-detail-articles')).toBeNull();
		expect(observers).toHaveLength(0);
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it('🔴 U-92.3: before the row nears the screen the name, the button and the skeleton show, and NOTHING is asked', async () => {
		const fetchImpl = stubFetch(() => ok([card('a')]));
		const { container } = draw({ articlesCount: 3, healthAdviceCount: 3 });
		await waitFor(() => expect(observers).toHaveLength(1));
		expect(screen.getByTestId('doctor-detail-articles')).toHaveTextContent(
			'Άρθρα · Συμβουλές υγείας'
		);
		expect(screen.getByTestId('doctor-articles-show-all')).toHaveTextContent('Εμφάνιση όλων των 6');
		expect(screen.getByTestId('doctor-articles-show-all')).toHaveAttribute(
			'href',
			'/doctors/dr-a/articles'
		);
		expect(container.querySelectorAll('[data-slot="article-card-skeleton"]')).toHaveLength(3);
		// U-92.3 (Δ2): as tall as the `list` card: its own text classes, one box per line (the title 2, the words 2, the meta).
		const lines = [
			...container
				.querySelectorAll('[data-slot="article-card-skeleton"]')[0]
				.querySelectorAll('[data-slot="article-card-skeleton-line"]')
		];
		expect(lines.map((line) => line.className)).toEqual([
			'flex items-center text-body-lg',
			'flex items-center text-body-lg',
			'flex items-center -mt-1 text-body-sm',
			'flex items-center text-body-sm',
			'flex items-center text-label-lg leading-tight'
		]);
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it('🔴 U-92.3: near the screen ONE read of three cards with `doctorId`, once, and the cards take the skeleton’s place', async () => {
		const fetchImpl = stubFetch(() =>
			ok([card('a'), card('b'), card('c')], { total: 6, appliedService: null })
		);
		const { container } = draw({ articlesCount: 3, healthAdviceCount: 3 });
		await waitFor(() => expect(observers).toHaveLength(1));
		observers[0].fire(false);
		expect(fetchImpl).not.toHaveBeenCalled();
		observers[0].fire(true);
		await screen.findByText('Τίτλος a');
		expect(fetchImpl).toHaveBeenCalledTimes(1);
		const asked = new URL(String((fetchImpl.mock.calls[0] as unknown as unknown[])[0]));
		expect(asked.pathname).toMatch(/\/article\/public\/articles$/u);
		expect(asked.searchParams.get('doctorId')).toBe('doc-1');
		expect(asked.searchParams.get('limit')).toBe('3');
		expect(container.querySelectorAll('[data-slot="article-card-skeleton"]')).toHaveLength(0);
		// U-77: the doctor's own row: no author's name on its cards; the time is the server's (U-92).
		expect(screen.getByTestId('doctor-articles-row')).not.toHaveTextContent('Dr. Α');
		expect(screen.getByTestId('doctor-articles-row')).toHaveTextContent('5΄');
	});

	it('Π5: three articles or fewer need no «Εμφάνιση όλων», and one kind names the section', async () => {
		stubFetch(() => ok([card('a')]));
		draw({ articlesCount: 1, healthAdviceCount: 0 });
		await waitFor(() => expect(observers).toHaveLength(1));
		expect(screen.getByTestId('doctor-detail-articles')).toHaveTextContent('Άρθρα');
		expect(screen.getByTestId('doctor-detail-articles')).not.toHaveTextContent('Συμβουλές');
		expect(screen.queryByTestId('doctor-articles-show-all')).toBeNull();
	});

	it('Π5: a failed read says so with «Δοκιμάστε ξανά», which asks only it again', async () => {
		let healthy = false;
		const fetchImpl = stubFetch(() =>
			healthy ? ok([card('a')], { total: 1 }) : new Response('{}', { status: 500 })
		);
		draw({ articlesCount: 1, healthAdviceCount: 0 });
		await waitFor(() => expect(observers).toHaveLength(1));
		observers[0].fire(true);
		const retry = await screen.findByTestId('doctor-articles-retry');
		healthy = true;
		retry.click();
		await screen.findByText('Τίτλος a');
		expect(fetchImpl).toHaveBeenCalledTimes(2);
	});
});
