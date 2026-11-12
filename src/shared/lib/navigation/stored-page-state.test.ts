import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { projectRoot } from '../../../../tests/architecture/source-scan';
import { readHistoryDepth, type HistoryDepthFlow } from './stored-page-state';

describe('shared/lib/navigation · readHistoryDepth (review w3-w3 R1 MINOR-5)', () => {
	it('the page state speaks first', () => {
		expect(readHistoryDepth('booking', { booking: { depth: 2 } }, null)).toBe(2);
		expect(
			readHistoryDepth(
				'onboarding',
				{ onboarding: { depth: 1 } },
				{
					'sveltekit:states': { onboarding: { depth: 4 } }
				}
			)
		).toBe(1);
	});

	it('U-112.2: after a reload (an empty page state) the entry’s own stored state still says how many steps lie behind', () => {
		expect(readHistoryDepth('booking', {}, { 'sveltekit:states': { booking: { depth: 1 } } })).toBe(
			1
		);
		expect(
			readHistoryDepth('onboarding', {}, { 'sveltekit:states': { onboarding: { depth: 3 } } })
		).toBe(3);
	});

	it('(negative) nothing, another flow’s, or no whole number of steps is 0 — never a step out of the site', () => {
		expect(readHistoryDepth('booking', {}, null)).toBe(0);
		expect(readHistoryDepth('booking', {}, undefined)).toBe(0);
		expect(
			readHistoryDepth('booking', {}, { 'sveltekit:states': { onboarding: { depth: 2 } } })
		).toBe(0);
		for (const depth of [-1, 1.5, '1', Number.NaN, 1000, null]) {
			expect(
				readHistoryDepth('booking', {}, { 'sveltekit:states': { booking: { depth } } }),
				String(depth)
			).toBe(0);
		}
		expect(readHistoryDepth('booking', {}, 'sveltekit:states')).toBe(0);
	});
	it('review w3-w4 R1 NIT-1: the flows are the page state’s own keys that count a depth — the shared code names none of them', () => {
		expectTypeOf<HistoryDepthFlow>().toEqualTypeOf<
			'booking' | 'onboarding' | 'appointment' | 'relatives'
		>();
		const source = readFileSync(
			join(projectRoot, 'src/shared/lib/navigation/stored-page-state.ts'),
			'utf8'
		)
			.replace(/\/\*[\s\S]*?\*\//gu, '')
			.replace(/\/\/.*$/gmu, '');
		expect(source).not.toMatch(/'booking'|'onboarding'|'appointment'|'relatives'/u);
	});

	it('wave 4 (U-136, U-139): an appointment’s change and a relative’s form count their steps the same way, also after a reload', () => {
		expect(readHistoryDepth('appointment', { appointment: { depth: 2 } }, null)).toBe(2);
		expect(
			readHistoryDepth('appointment', {}, { 'sveltekit:states': { appointment: { depth: 1 } } })
		).toBe(1);
		expect(
			readHistoryDepth('relatives', {}, { 'sveltekit:states': { relatives: { depth: 1 } } })
		).toBe(1);
		// (negative) another flow's steps are not this one's: a link to the form goes on in place.
		expect(
			readHistoryDepth('appointment', {}, { 'sveltekit:states': { booking: { depth: 2 } } })
		).toBe(0);
		expect(readHistoryDepth('relatives', { appointment: { depth: 1 } }, null)).toBe(0);
	});
});
