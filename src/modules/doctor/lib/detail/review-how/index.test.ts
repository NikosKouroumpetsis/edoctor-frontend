import { describe, expect, it } from 'vitest';
import { buildDoctorReviewHowBlocks, buildDoctorReviewHowLinks } from '.';

describe('D-W4-24 · «Πώς λειτουργούν οι κριτικές» (U-67.1, one builder for screen 12 and screen 54)', () => {
	it('the five sections in their order, each a title over its words', () => {
		const blocks = buildDoctorReviewHowBlocks('el');
		expect(blocks).toHaveLength(5);
		expect(blocks.every((block) => block.heading.length > 0 && block.text.length > 0)).toBe(true);
		expect(buildDoctorReviewHowBlocks('en').map((block) => block.heading)).not.toEqual(
			blocks.map((block) => block.heading)
		);
	});

	it('the two ways on at the caller’s addresses (the module knows no route)', () => {
		expect(
			buildDoctorReviewHowLinks('el', {
				helpHref: '/help#reviews',
				policyHref: '/legal/review-policy'
			})
		).toEqual([
			{ id: 'help', label: expect.any(String), href: '/help#reviews' },
			{ id: 'policy', label: 'Πολιτική κριτικών', href: '/legal/review-policy' }
		]);
	});
});
