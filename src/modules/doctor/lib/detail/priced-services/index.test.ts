import { describe, expect, it } from 'vitest';
import { buildPricedService } from './index';

const facts = {
	id: 'svc-1',
	title: 'Επίσκεψη',
	kind: 'visit' as const,
	priceRange: { min: 40, max: 40 },
	isSpecialized: false
};

describe('lib/detail priced-services (U-70)', () => {
	it('the row’s facts: its kind, its line, «30΄» and how it is said, the text', () => {
		expect(
			buildPricedService(
				{ ...facts, subtitle: 'Γραμμή', durationInMinutes: 30, description: 'Κείμενο' },
				true,
				'el'
			)
		).toEqual({
			id: 'svc-1',
			title: 'Επίσκεψη',
			kind: 'visit',
			subtitle: 'Γραμμή',
			price: { kind: 'amount', label: '40\u00a0€' },
			durationLabel: '30΄',
			durationAccessibleLabel: '30 λεπτά',
			descriptionBody: 'Κείμενο'
		});
	});

	it('U-34.3: what is missing does not show', () => {
		const row = buildPricedService(facts, true, 'el');
		expect(row).not.toHaveProperty('subtitle');
		expect(row).not.toHaveProperty('durationLabel');
		expect(row).not.toHaveProperty('descriptionBody');
	});

	it('U-34.4: a guest’s fee is the sign-in, never a number', () => {
		expect(buildPricedService(facts, false, 'el').price.kind).toBe('login');
	});

	it('U-70.2 Ε2: «Περιλαμβάνει» and its general phrase are gone', () => {
		expect(JSON.stringify(buildPricedService(facts, true, 'el'))).not.toMatch(/Περιλαμβάνει/u);
	});
});
