import { describe, expect, it } from 'vitest';
import { cancelReasonLabel } from '.';

describe('shared/lib/appointment-reasons (D-W51-37: the 51 and the 68 read a cancellation the same way)', () => {
	it('a stored reason in words, of either side', () => {
		expect(cancelReasonLabel('EMERGENCY', 'el')).toBe('Έκτακτο περιστατικό');
		expect(cancelReasonLabel('FEELING_BETTER', 'el')).toBe('Αισθάνομαι καλύτερα');
		expect(cancelReasonLabel('DOCTOR_UNAVAILABLE', 'en')).not.toBe('DOCTOR_UNAVAILABLE');
	});

	it('(negative, U-65.6) an unknown code, an inherited name or none is no words — never the code itself', () => {
		expect(cancelReasonLabel('LATE', 'el')).toBeNull();
		expect(cancelReasonLabel('constructor', 'el')).toBeNull();
		expect(cancelReasonLabel('<b>OTHER</b>', 'el')).toBeNull();
		expect(cancelReasonLabel(null, 'el')).toBeNull();
	});
});
