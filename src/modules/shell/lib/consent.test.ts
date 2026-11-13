import { describe, expect, it } from 'vitest';
import type { ConsentToolFacts } from '$modules/shell/api/consent';
import { consentSummaryLine, openConsentCategories, resolveConsentPrompt } from './consent';

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

describe('🔴 D-W45-28 (wave 4.5, screen 62): what the row «Εργαλεία τρίτων και cookies» says is open', () => {
	const functional = tool('live-chat', 'functional');
	const marketing = tool('web-ads', 'marketing');
	const video = tool('video', 'functional');
	// The catalogue in an order that is NOT the categories': the line follows the categories' own order.
	const tools = [marketing, analytics, essential, functional, video];
	const decided = (choices: Record<string, boolean>) => ({ registryVersion: '2', choices });

	it('D-W45-28: «Μόνο τα απαραίτητα» with no decision, and with every optional tool closed', () => {
		expect(consentSummaryLine(tools, null, 'el')).toBe('Μόνο τα απαραίτητα');
		expect(
			consentSummaryLine(
				tools,
				decided({
					'edoctor-api': true,
					'web-analytics': false,
					'web-ads': false,
					'live-chat': false
				}),
				'el'
			)
		).toBe('Μόνο τα απαραίτητα');
		expect(consentSummaryLine(tools, decided({ 'edoctor-api': true }), 'en')).toBe(
			'Only the essential ones'
		);
	});

	it('D-W45-28: «Απαραίτητα, » and the names of the OPEN categories, in the catalogue’s order — every combination', () => {
		const cases: [Record<string, boolean>, string][] = [
			[{ 'web-analytics': true }, 'Απαραίτητα, Στατιστικά'],
			[{ 'live-chat': true }, 'Απαραίτητα, Λειτουργικά'],
			[{ 'web-ads': true }, 'Απαραίτητα, Στόχευση και διαφήμιση'],
			[{ 'web-ads': true, 'live-chat': true }, 'Απαραίτητα, Λειτουργικά, Στόχευση και διαφήμιση'],
			[
				{ 'web-ads': true, 'web-analytics': true },
				'Απαραίτητα, Στατιστικά, Στόχευση και διαφήμιση'
			],
			[{ 'web-analytics': true, 'live-chat': true }, 'Απαραίτητα, Λειτουργικά, Στατιστικά'],
			[
				{ 'web-ads': true, 'web-analytics': true, 'live-chat': true },
				'Απαραίτητα, Λειτουργικά, Στατιστικά, Στόχευση και διαφήμιση'
			]
		];
		for (const [choices, line] of cases) {
			expect(consentSummaryLine(tools, decided({ 'edoctor-api': true, ...choices }), 'el')).toBe(
				line
			);
		}
		expect(
			consentSummaryLine(tools, decided({ 'web-ads': true, 'web-analytics': true }), 'en')
		).toBe('Essential, Analytics, Targeting and advertising');
	});

	it('a category is open when ANY of its tools is allowed, and is named once', () => {
		expect(openConsentCategories(tools, decided({ video: true, 'live-chat': false }))).toEqual([
			'functional'
		]);
		expect(openConsentCategories(tools, decided({ video: true, 'live-chat': true }))).toEqual([
			'functional'
		]);
	});

	it('(negative) an essential tool never names a category; a tool the catalogue no longer has, or a value that is not `true`, opens nothing', () => {
		expect(openConsentCategories(tools, decided({ 'edoctor-api': true }))).toEqual([]);
		expect(openConsentCategories(tools, decided({ gone: true, __proto__: true } as never))).toEqual(
			[]
		);
		expect(
			openConsentCategories(tools, decided({ 'web-ads': 'yes', 'web-analytics': 1 } as never))
		).toEqual([]);
		expect(openConsentCategories([], decided({ 'web-ads': true }))).toEqual([]);
	});
});
