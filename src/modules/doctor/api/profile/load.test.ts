import { describe, expect, it, vi } from 'vitest';
import { isDoctorSlug, loadDoctorProfile } from './load';

/** The backend's envelope, as the api client reads it. */
function envelope(data: unknown, status = 200): Response {
	return new Response(JSON.stringify({ status: 'success', message: 'ok', data }), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

const doctor = { doctorId: 'doc-1', slug: 'dr-athena', fullName: 'Αθηνά Παπαδοπούλου' };

describe('api/profile load (the route’s read)', () => {
	it('U-28.4: ONE read through the route’s `fetch` — a ready profile with the server’s «now»', async () => {
		const fetchImpl = vi.fn<(input: RequestInfo | URL) => Promise<Response>>(async () =>
			envelope({ doctor, pricingVisible: false })
		);
		const result = await loadDoctorProfile(fetchImpl as unknown as typeof fetch, 'dr-athena', 'el');
		expect(fetchImpl).toHaveBeenCalledTimes(1);
		expect(String(fetchImpl.mock.calls[0]?.[0])).toContain('/doctor/public/doctors/dr-athena');
		expect(result.state).toBe('ready');
		expect(result.state === 'ready' && result.profile.doctorSlug).toBe('dr-athena');
		expect(result.state === 'ready' && Number.isFinite(result.serverNow)).toBe(true);
	});

	it('Π7: a slug that is no slug is the 404 without a request (a route parameter is untrusted input)', async () => {
		const fetchImpl = vi.fn();
		expect(isDoctorSlug('dr-athena-2')).toBe(true);
		expect(isDoctorSlug('../admin')).toBe(false);
		expect(isDoctorSlug('a'.repeat(161))).toBe(false);
		expect(await loadDoctorProfile(fetchImpl as unknown as typeof fetch, '../admin', 'el')).toEqual(
			{
				state: 'not-found'
			}
		);
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it('Π7: a `doctor: null` answer or the backend’s 404 is the route’s 404; any other failure the page’s «Δοκιμάστε ξανά» — it never throws', async () => {
		const missing = vi.fn(async () => envelope({ doctor: null, pricingVisible: false }));
		expect(await loadDoctorProfile(missing as unknown as typeof fetch, 'dr-gone', 'el')).toEqual({
			state: 'not-found'
		});
		const gone = vi.fn(async () => new Response('', { status: 404 }));
		expect((await loadDoctorProfile(gone as unknown as typeof fetch, 'dr-gone', 'el')).state).toBe(
			'not-found'
		);
		const broken = vi.fn(async () => {
			throw new TypeError('network down');
		});
		const failed = await loadDoctorProfile(broken as unknown as typeof fetch, 'dr-athena', 'el');
		expect(failed).toMatchObject({ state: 'failed', slug: 'dr-athena' });
	});
});
