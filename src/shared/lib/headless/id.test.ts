import { describe, expect, it, beforeEach } from 'vitest';
import { useId, __resetIdCounter } from './id';

describe('useId', () => {
	beforeEach(() => __resetIdCounter());

	it('generates unique, incrementing ids', () => {
		const a = useId();
		const b = useId();
		expect(a).not.toBe(b);
		expect(a).toBe('ed-1');
		expect(b).toBe('ed-2');
	});

	it('honours an explicit deterministic id and does not advance the counter', () => {
		expect(useId('custom')).toBe('custom');
		expect(useId()).toBe('ed-1');
	});

	it('supports a custom prefix', () => {
		expect(useId(undefined, 'dialog')).toBe('dialog-1');
	});
});
