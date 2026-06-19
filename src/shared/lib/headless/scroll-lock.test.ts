import { describe, expect, it, afterEach } from 'vitest';
import { lockBodyScroll, __getLockCount } from './scroll-lock';

describe('lockBodyScroll', () => {
	afterEach(() => {
		document.body.style.overflow = '';
		document.body.style.paddingRight = '';
	});

	it('locks the body overflow and releases on unlock', () => {
		const unlock = lockBodyScroll();
		expect(document.body.style.overflow).toBe('hidden');
		expect(__getLockCount()).toBe(1);
		unlock();
		expect(document.body.style.overflow).toBe('');
		expect(__getLockCount()).toBe(0);
	});

	it('reference-counts concurrent locks (last one wins)', () => {
		const unlockA = lockBodyScroll();
		const unlockB = lockBodyScroll();
		expect(__getLockCount()).toBe(2);
		unlockA();
		// Still locked because B holds a reference.
		expect(document.body.style.overflow).toBe('hidden');
		unlockB();
		expect(document.body.style.overflow).toBe('');
	});

	it('makes unlock idempotent', () => {
		const unlock = lockBodyScroll();
		unlock();
		unlock();
		expect(__getLockCount()).toBe(0);
	});
});
