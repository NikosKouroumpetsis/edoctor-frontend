import { describe, expect, it } from 'vitest';
import { load } from './+page';

const ID = '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5b';

const run = (invitationId: string) => load({ params: { invitationId } } as never);

function thrown(call: () => unknown): { status?: number } {
	try {
		call();
	} catch (error) {
		return error as { status?: number };
	}
	return {};
}

describe('routes/ratings/[invitationId] load (U-138.3, D-W4-51)', () => {
	it('U-138.3: the email’s link names its invitation, and the page opens on it', () => {
		expect(run(ID)).toEqual({ invitationId: ID });
	});

	it('🔴 U-65.6 (negative): anything but a server id is a 404 — a word, a script, a path out, a slash (an encoded one reaches the load decoded, review w4-w1 R1 NIT-4), a very long value', () => {
		for (const invitationId of [
			'',
			'new',
			'1',
			'<script>alert(1)</script>',
			'../admin',
			`${ID}x`,
			`${ID}/submit`,
			' '.concat(ID),
			'a'.repeat(4096)
		]) {
			expect(
				thrown(() => run(invitationId)),
				invitationId
			).toMatchObject({ status: 404 });
		}
	});
});
