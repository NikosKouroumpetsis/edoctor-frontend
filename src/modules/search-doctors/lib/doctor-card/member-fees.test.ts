import { describe, expect, it } from 'vitest';
import type { DoctorCard } from '$modules/search-doctors/types';
import { overlayMemberFees } from './index';

const card = (id: string, fee: DoctorCard['fee']): DoctorCard & { pinLabel?: string | null } => ({
	id,
	doctorSlug: id,
	name: id,
	specialty: 'Παθολόγος',
	area: 'Αθήνα',
	imageUrl: '',
	availabilityLabel: '',
	fee,
	ratingLabel: '4,9'
});
const hidden = { kind: 'login', label: 'Συνδεθείτε για κόστος' } as const;
const amount = { kind: 'amount', label: 'Από 60 €' } as const;

describe('overlayMemberFees (U-34.4)', () => {
	it('only the fee changes, and the order stays the page’s: nothing moves', () => {
		const page = [card('a', hidden), card('b', hidden)];
		const shown = overlayMemberFees(page, [
			card('b', amount),
			card('a', { kind: 'amount', label: 'Από 40 €' })
		]);
		expect(shown.map((entry) => entry.id)).toEqual(['a', 'b']);
		expect(shown.map((entry) => entry.fee.label)).toEqual(['Από 40 €', 'Από 60 €']);
	});

	it('the pin’s price follows only where the card has one', () => {
		const withPin = { ...card('a', hidden), pinLabel: null };
		const [shown] = overlayMemberFees([withPin], [{ ...card('a', amount), pinLabel: '60 €' }]);
		expect(shown.pinLabel).toBe('60 €');
		const [plain] = overlayMemberFees(
			[card('a', hidden)],
			[{ ...card('a', amount), pinLabel: '60 €' }]
		);
		expect(plain).not.toHaveProperty('pinLabel');
	});

	it('(negative) no answer, a card it did not bring, or one it brought hidden: the page’s stays', () => {
		const page = [card('a', hidden), card('b', hidden)];
		expect(overlayMemberFees(page, undefined)).toEqual(page);
		expect(overlayMemberFees(page, [card('b', hidden)])).toEqual(page);
	});
});
