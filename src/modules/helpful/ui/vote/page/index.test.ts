import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { Component } from 'svelte';
import QueryHarness from '$shared/query/query.harness.svelte';
import HelpfulVote from './index.svelte';

const KEY = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const STORAGE = 'edoctor.test.helpful.v1';

type Call = { url: string; method: string; init: RequestInit };
let calls: Call[];
let mine: unknown[];
let vote: (body: Record<string, unknown>) => Response;

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});

beforeEach(() => {
	calls = [];
	mine = [];
	vote = (body) => json({ ...body, reason: body.reason ?? null, voterKey: KEY });
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init: RequestInit = {}) => {
			const method = init.method ?? 'GET';
			calls.push({ url, method, init });
			if (method === 'PUT') return vote(JSON.parse(String(init.body)));
			return json(mine);
		})
	);
	window.localStorage.clear();
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

function draw(target = 'article:ti-einai', size?: 'sm') {
	return render(QueryHarness, {
		props: {
			component: HelpfulVote as unknown as Component<never>,
			props: { target, size, locale: 'el' }
		}
	});
}

const user = () => userEvent.setup({ delay: null });
const up = () => screen.getByRole('button', { name: 'Ναι, ήταν χρήσιμο' });
const down = () => screen.getByRole('button', { name: 'Όχι, δεν ήταν χρήσιμο' });
const puts = () => calls.filter((call) => call.method === 'PUT');
const bodyOf = (call: Call) => JSON.parse(String(call.init.body));

describe('helpful::ui::vote (U-78, screen 23)', () => {
	it('U-78.1 Ε2: a device that never voted asks nothing; its first vote gets a key and keeps it', async () => {
		draw();
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(calls).toEqual([]);
		await user().click(up());
		expect(up()).toHaveAttribute('aria-pressed', 'true');
		expect(document.querySelector('[data-slot="helpful-feedback-thanks"]')).toHaveAttribute(
			'aria-hidden',
			'false'
		);
		await waitFor(() => expect(puts()).toHaveLength(1));
		expect(bodyOf(puts()[0])).toEqual({ target: 'article:ti-einai', value: 'up', lang: 'el' });
		expect(puts()[0].init.credentials).toBe('omit');
		expect(puts()[0].init.headers).not.toHaveProperty('X-Helpful-Voter');
		await waitFor(() => expect(window.localStorage.getItem(STORAGE)).toBe(KEY));
	});

	it('U-78.1 Ε2: from then on the key travels in a header, never in the address', async () => {
		window.localStorage.setItem(STORAGE, KEY);
		mine = [{ target: 'article:ti-einai', value: 'down', reason: 'unclear' }];
		draw();
		await waitFor(() => expect(down()).toHaveAttribute('aria-pressed', 'true'));
		const [read] = calls;
		expect(read.url).toContain('target=article%3Ati-einai');
		expect(read.url).not.toContain(KEY);
		expect(read.init.headers).toMatchObject({ 'X-Helpful-Voter': KEY });
		expect(read.init.credentials).toBe('omit');
		expect(screen.getByRole('button', { name: 'Δύσκολο στην κατανόηση' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
	});

	it('Π1: the FAQ’s questions share one read of the device’s answers', async () => {
		window.localStorage.setItem(STORAGE, KEY);
		mine = [{ target: 'faq:cancellation', value: 'up', reason: null }];
		draw('faq:cancellation', 'sm');
		await waitFor(() => expect(up()).toHaveAttribute('aria-pressed', 'true'));
		expect(calls[0].url).toContain('kind=faq');
		expect(calls[0].url).not.toContain('target=');
	});

	it('Π2: a second press takes it back: `none`, no reason', async () => {
		window.localStorage.setItem(STORAGE, KEY);
		draw();
		await user().click(up());
		await waitFor(() => expect(puts()).toHaveLength(1));
		await user().click(up());
		await waitFor(() => expect(puts()).toHaveLength(2));
		expect(bodyOf(puts()[1])).toEqual({ target: 'article:ti-einai', value: 'none', lang: 'el' });
		expect(up()).toHaveAttribute('aria-pressed', 'false');
		expect(puts()[1].init.headers).toMatchObject({ 'X-Helpful-Voter': KEY });
	});

	it('Π3: after «down» a reason goes too, one of the closed list', async () => {
		window.localStorage.setItem(STORAGE, KEY);
		draw();
		await user().click(down());
		await waitFor(() => expect(puts()).toHaveLength(1));
		await user().click(screen.getByRole('button', { name: 'Λάθος ή παλιά πληροφορία' }));
		await waitFor(() => expect(puts()).toHaveLength(2));
		expect(bodyOf(puts()[1])).toEqual({
			target: 'article:ti-einai',
			value: 'down',
			reason: 'outdated',
			lang: 'el'
		});
	});

	it('Π2: a press before the read has answered is not overwritten by it, and the page’s other answers come after it', async () => {
		window.localStorage.setItem(STORAGE, KEY);
		mine = [{ target: 'faq:other', value: 'down', reason: null }];
		draw('faq:cancellation', 'sm');
		await user().click(up());
		await waitFor(() => expect(puts()).toHaveLength(1));
		expect(up()).toHaveAttribute('aria-pressed', 'true');
		expect(bodyOf(puts()[0]).value).toBe('up');
	});

	it('Π2 (negative): a refusal takes the choice back and says so', async () => {
		vote = () => json(null, 429);
		draw();
		await user().click(up());
		expect(await screen.findByRole('alert')).toHaveTextContent(
			'Η απάντηση δεν καταγράφηκε. Δοκιμάστε ξανά.'
		);
		expect(up()).toHaveAttribute('aria-pressed', 'false');
		expect(window.localStorage.getItem(STORAGE)).toBeNull();
	});

	it('Π2 (negative): a failed read of the answers shows no answer, and the thumbs still work', async () => {
		window.localStorage.setItem(STORAGE, KEY);
		vi.mocked(fetch).mockImplementationOnce(async () => json(null, 500));
		draw();
		await user().click(up());
		await waitFor(() => expect(puts()).toHaveLength(1));
		expect(up()).toHaveAttribute('aria-pressed', 'true');
	});

	it('U-78.1: κανένα πλήθος ψήφων: whatever an answer holds, no number reaches the reader', async () => {
		window.localStorage.setItem(STORAGE, KEY);
		mine = [{ target: 'article:ti-einai', value: 'up', reason: null, up: 41, down: 7, total: 48 }];
		vote = (body) => json({ ...body, reason: null, up: 42, total: 49 });
		const { container } = draw();
		await waitFor(() => expect(up()).toHaveAttribute('aria-pressed', 'true'));
		await user().click(down());
		await waitFor(() => expect(puts()).toHaveLength(1));
		expect(container.textContent).not.toMatch(/\d/u);
	});

	it('U-78.1: the kit’s component has no place for a count', async () => {
		const source = (await import('node:fs')).readFileSync(
			`${process.cwd()}/src/shared/ui/molecules/helpful-feedback/helpful-feedback.svelte`,
			'utf8'
		);
		expect(source).not.toMatch(/\b(count|total|upCount|downCount)\??:/u);
	});
});
