import { describe, expect, it } from 'vitest';
import { showPhoneNumber, toPhoneNumber, useDoctorOnboardingScreen } from './use-screen.svelte';

/**
 * 🔴 W8 Delta 2 (review w3-w8 R1 NIT-3): the screen composes the sign-up's rule for a number from the sign-in's own; the
 * page specs each hold a copy of it, so this is the one test of the rule the screen actually hands over.
 */
describe('the doctor’s sign-up screen · its rule for a number (W8-Σ1)', () => {
	it('W8 Delta 2: a Greek number as people write it leaves in the server’s form — «210 412 3456», «+30 210 412 3456», «0030 210 412 3456», «(210) 412-3456» ⇒ «+302104123456»; a mobile the same', () => {
		for (const typed of [
			'210 412 3456',
			'+30 210 412 3456',
			'0030 210 412 3456',
			'(210) 412-3456'
		]) {
			expect(toPhoneNumber(typed), typed).toBe('+302104123456');
		}
		expect(toPhoneNumber('691 234 5678')).toBe('+306912345678');
		expect(toPhoneNumber('+357 22 123456')).toBe('+35722123456');
	});

	it('W8 Delta 2 (negative): what cannot be a number is `null` — letters, an address, a script, too short, too long (16 digits ⇒ 19 with +30)', () => {
		for (const typed of [
			'',
			'   ',
			'210abc4567',
			'dr@example.test',
			'<script>1</script>',
			'12345',
			'1234567890123456'
		]) {
			expect(toPhoneNumber(typed), typed).toBeNull();
		}
	});

	it('W8 Delta 3 (N1): a kept number shows as the sign-in’s field shows one — a Greek one’s national digits, another country’s prefix and digits — and reads back to the same E.164', () => {
		expect(showPhoneNumber('+302101000099')).toBe('2101000099');
		expect(showPhoneNumber('+306912345678')).toBe('6912345678');
		expect(showPhoneNumber('+447911123456')).toBe('+44 7911123456');
		for (const kept of ['+302101000099', '+306912345678', '+447911123456', '+35722123456']) {
			expect(toPhoneNumber(showPhoneNumber(kept)), kept).toBe(kept);
		}
	});

	it('W8 Delta 3 (N1, negative): what is no kept E.164 stays as it is — empty, national digits, a prefix no country has, text', () => {
		for (const stored of ['', '2104123456', '+999 1234567', 'κάτι']) {
			expect(showPhoneNumber(stored), stored).toBe(stored);
		}
	});

	it('W8 Delta 2 / Delta 3: the screen hands its pages exactly these rules', () => {
		const screen = useDoctorOnboardingScreen(() => ({ screen: 'office' }) as never);
		expect(screen.context.toPhoneNumber).toBe(toPhoneNumber);
		expect(screen.context.showPhoneNumber).toBe(showPhoneNumber);
	});
});
