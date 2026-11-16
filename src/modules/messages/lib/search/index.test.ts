import { describe, expect, it } from 'vitest';
import { readInboxSearchQuery } from '.';

describe('🔴 D-W51-80: the doctor’s search of its conversations (U-65.6)', () => {
	it('the words typed, trimmed', () => {
		expect(readInboxSearchQuery('  κα ')).toBe('κα');
		expect(readInboxSearchQuery('')).toBe('');
		expect(readInboxSearchQuery('   ')).toBe('');
	});

	it('(negative) never a control character, never past 40', () => {
		expect(readInboxSearchQuery('κα\u0000ρ\u0007ρ\u001bα\u007f')).toBe('καρρα');
		expect(readInboxSearchQuery('α'.repeat(41))).toHaveLength(40);
		expect(readInboxSearchQuery(`${'α'.repeat(39)} β`)).toBe('α'.repeat(39));
	});
});
