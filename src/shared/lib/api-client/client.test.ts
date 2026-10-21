import { describe, expect, it } from 'vitest';

import { createApiClient, unwrapEnvelope } from './client';

function envelopeResponse(data: unknown): Response {
	return new Response(JSON.stringify({ status: 'success', message: 'ok', data }), {
		status: 200,
		headers: { 'content-type': 'application/json' }
	});
}

/** Captures the URL openapi-fetch produces and returns a canned envelope. */
function recordingFetch(data: unknown) {
	const calls: string[] = [];
	const fetchImpl: typeof fetch = (input) => {
		const url =
			typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
		calls.push(url);
		return Promise.resolve(envelopeResponse(data));
	};

	return { calls, fetchImpl };
}

describe('api client request paths', () => {
	it('produces the search URL identical to the existing endpoint', async () => {
		const { calls, fetchImpl } = recordingFetch({ items: [] });
		const client = createApiClient(fetchImpl);

		await client.GET('/doctor/public/doctors');

		expect(calls[0]).toBe('http://localhost:8080/api/v1/doctor/public/doctors');
	});

	it('serializes query params onto the request URL', async () => {
		const { calls, fetchImpl } = recordingFetch({ items: [] });
		const client = createApiClient(fetchImpl);

		await client.GET('/doctor/public/doctors', {
			params: { query: { limit: '8', sortBy: 'rating' } }
		});

		expect(calls[0]).toBe(
			'http://localhost:8080/api/v1/doctor/public/doctors?limit=8&sortBy=rating'
		);
	});
});

describe('unwrapEnvelope', () => {
	it('returns the inner data payload on success', async () => {
		const { fetchImpl } = recordingFetch({ items: ['a'] });
		const client = createApiClient(fetchImpl);

		const result = await client.GET('/doctor/public/doctors');
		const data = unwrapEnvelope(result, 'http://localhost:8080/api/v1/doctor/public/doctors');

		expect(data).toEqual({ items: ['a'] });
	});

	it('throws ApiError when the response is not ok', () => {
		const response = new Response('', { status: 500 });

		expect(() => unwrapEnvelope({ response }, 'http://x/y')).toThrowError(
			'Request failed with status 500'
		);
	});

	it('throws ApiError when the envelope is malformed', () => {
		const response = new Response('', { status: 200 });

		expect(() => unwrapEnvelope({ data: undefined, response }, 'http://x/y')).toThrowError(
			'Response was not a valid API envelope'
		);
	});
});
