import { describe, expect, it } from 'vitest';

import { createDoctorApiClient, getDoctorApiBaseUrl, unwrapEnvelope } from './client';

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

describe('doctor api client base URL', () => {
	it('reconciles server + operation paths to the current runtime URL', () => {
		// The hand-written `$shared/lib/http` client hits
		// `{origin}/api/v1` + `/doctor/public/doctors`. openapi-fetch uses
		// baseUrl `{origin}/api/v1/doctor` + operation path `/public/doctors`.
		expect(getDoctorApiBaseUrl()).toBe('http://localhost:8081/api/v1/doctor');
	});
});

describe('doctor api client request paths', () => {
	it('produces the search URL identical to the existing endpoint', async () => {
		const { calls, fetchImpl } = recordingFetch({ items: [] });
		const client = createDoctorApiClient(fetchImpl);

		await client.GET('/public/doctors');

		expect(calls[0]).toBe('http://localhost:8081/api/v1/doctor/public/doctors');
	});

	it('serializes query params onto the request URL', async () => {
		const { calls, fetchImpl } = recordingFetch({ items: [] });
		const client = createDoctorApiClient(fetchImpl);

		await client.GET('/public/doctors', { params: { query: { limit: '8', sortBy: 'rating' } } });

		expect(calls[0]).toBe(
			'http://localhost:8081/api/v1/doctor/public/doctors?limit=8&sortBy=rating'
		);
	});
});

describe('unwrapEnvelope', () => {
	it('returns the inner data payload on success', async () => {
		const { fetchImpl } = recordingFetch({ items: ['a'] });
		const client = createDoctorApiClient(fetchImpl);

		const result = await client.GET('/public/doctors');
		const data = unwrapEnvelope(result, 'http://localhost:8081/api/v1/doctor/public/doctors');

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
