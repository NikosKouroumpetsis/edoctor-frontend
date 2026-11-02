import { describe, expect, it } from 'vitest';
import type { ConsentToolFacts } from '$modules/shell/api/consent';
import { resolveConsentPrompt } from './consent';

const tool = (id: string, category: ConsentToolFacts['category']): ConsentToolFacts => ({
	id,
	category,
	platforms: ['web'],
	policyUrl: null,
	translations: { el: { title: id, description: '' }, en: { title: id, description: '' } }
});

const essential = tool('edoctor-api', 'essential');
const analytics = tool('web-analytics', 'analytics');

describe('resolveConsentPrompt (the application’s)', () => {
	it('U-16.5: asks without a decision, or for a non-essential tool never answered; an empty registry never asks', () => {
		expect(
			resolveConsentPrompt({ snapshot: null, tools: [essential], registryVersion: '1' })
		).toEqual({
			shouldPrompt: true,
			reconciledSnapshot: null
		});
		expect(
			resolveConsentPrompt({
				snapshot: { registryVersion: '1', choices: { 'edoctor-api': true } },
				tools: [essential, analytics],
				registryVersion: '2'
			}).shouldPrompt
		).toBe(true);
		expect(
			resolveConsentPrompt({ snapshot: null, tools: [], registryVersion: '1' }).shouldPrompt
		).toBe(false);
	});

	// MAJOR-3 (r1): r0 had no reconciliation — the stored version stayed the old one after an essential-only bump.
	it('U-16.5: an essential-only bump is reconciled silently — the new version, the choices kept, a departed tool dropped', () => {
		const resolution = resolveConsentPrompt({
			snapshot: {
				registryVersion: '1',
				choices: { 'edoctor-api': true, 'web-analytics': false, 'gone-tool': true }
			},
			tools: [essential, tool('edoctor-maps', 'essential'), analytics],
			registryVersion: '2'
		});
		expect(resolution).toEqual({
			shouldPrompt: false,
			reconciledSnapshot: {
				registryVersion: '2',
				choices: { 'edoctor-api': true, 'edoctor-maps': true, 'web-analytics': false }
			}
		});
	});

	it('U-16.5: the same version and choices need nothing written', () => {
		expect(
			resolveConsentPrompt({
				snapshot: { registryVersion: '2', choices: { 'edoctor-api': true, 'web-analytics': true } },
				tools: [essential, analytics],
				registryVersion: '2'
			})
		).toEqual({ shouldPrompt: false, reconciledSnapshot: null });
	});
});
