import { describe, expect, it } from 'vitest';
import { isUuid } from '.';

describe('shared::lib::ids', () => {
	it('a server id passes, in either case', () => {
		expect(isUuid('0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5b')).toBe(true);
		expect(isUuid('0193A1B2-7C3D-7E4F-8A9B-0C1D2E3F4A5B')).toBe(true);
	});

	it.each([
		'',
		'new',
		'1',
		"'; DROP",
		'<script>',
		'../../etc',
		'0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5',
		'0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5bx',
		' 0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5b',
		'0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5b/time',
		'0193a1b27c3d7e4f8a9b0c1d2e3f4a5b',
		'g193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5b',
		'0'.repeat(600)
	])('🔴 U-65.6 (negative): %j is no id', (value) => {
		expect(isUuid(value)).toBe(false);
	});
});
