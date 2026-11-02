import { describe, expect, it } from 'vitest';
import type { SearchDoctorsLocationFact } from '$modules/search-doctors/api/marketplace/location-suggestions-adapter';
import { criteriaTranslator } from '$modules/search-doctors/lib/criteria-messages';
import {
	buildCriteriaLocationOptions,
	buildLocationBreadcrumb,
	buildReadyLocationOptions,
	readyRegionalUnitRows,
	toCriteriaLocationOption,
	toReadyLocationLookup,
	toWhereSelection
} from '.';

// The application's cases and guards (`lib/criteria-locations/index.unit.spec.ts`), the same titles (S-22).
function fact(overrides: Partial<SearchDoctorsLocationFact> = {}): SearchDoctorsLocationFact {
	return {
		slug: 'dimos-peiraia',
		type: 'MUNICIPALITY',
		label: 'Piraeus',
		displayName: 'Municipality of Piraeus',
		context: null,
		hierarchy: {
			region: 'Attica',
			regionalUnit: 'Piraeus',
			municipality: 'Municipality of Piraeus'
		},
		latitude: 37.9425,
		longitude: 23.6465,
		...overrides
	};
}

describe('search-doctors::criteria-locations', () => {
	describe('buildLocationBreadcrumb', () => {
		it('lists parent levels specific -> broad, excluding the row own display name', () => {
			expect(buildLocationBreadcrumb(fact())).toBe('Piraeus, Attica');
		});

		it('returns undefined for a top-level region whose only level is itself', () => {
			expect(
				buildLocationBreadcrumb(
					fact({
						type: 'REGION',
						displayName: 'Attica',
						hierarchy: { region: 'Attica', regionalUnit: null, municipality: null }
					})
				)
			).toBeUndefined();
		});

		it('de-duplicates repeated hierarchy values', () => {
			expect(
				buildLocationBreadcrumb(
					fact({
						displayName: 'Neo Faliro',
						type: 'SETTLEMENT',
						hierarchy: { region: 'Attica', regionalUnit: 'Piraeus', municipality: 'Piraeus' }
					})
				)
			).toBe('Piraeus, Attica');
		});

		it('falls back to the backend context when the hierarchy yields nothing', () => {
			expect(
				buildLocationBreadcrumb(
					fact({
						displayName: 'Attica',
						context: 'Region of Attica',
						hierarchy: { region: 'Attica', regionalUnit: null, municipality: null }
					})
				)
			).toBe('Region of Attica');
		});
	});

	describe('toCriteriaLocationOption', () => {
		it('S-20.1: the big text is the server name (label), never the hidden full name (displayName)', () => {
			const option = toCriteriaLocationOption(fact());
			expect(option).toEqual({
				slug: 'dimos-peiraia',
				type: 'MUNICIPALITY',
				label: 'Piraeus',
				supportingLabel: 'Piraeus, Attica',
				latitude: 37.9425,
				longitude: 23.6465
			});
			expect(option.label).not.toBe('Municipality of Piraeus');
		});

		it('omits the supporting label when there is no breadcrumb', () => {
			expect(
				toCriteriaLocationOption(
					fact({
						type: 'REGION',
						displayName: 'Attica',
						hierarchy: { region: 'Attica', regionalUnit: null, municipality: null }
					})
				)
			).not.toHaveProperty('supportingLabel');
		});
	});

	it('preserves the relevance order as one flat list', () => {
		expect(
			buildCriteriaLocationOptions([fact({ slug: 'a' }), fact({ slug: 'b' })]).map(
				(option) => option.slug
			)
		).toEqual(['a', 'b']);
	});

	it('S-17: a committed row keeps the server slug and carries its name as the label', () => {
		expect(toWhereSelection(toCriteriaLocationOption(fact()))).toEqual({
			kind: 'location',
			label: 'Piraeus',
			slug: 'dimos-peiraia',
			locationType: 'MUNICIPALITY'
		});
	});

	describe('owner decisions (server-shaped rows)', () => {
		const piraeus = fact({
			slug: 'peiraias-dimos-peiraia-attiki',
			type: 'MUNICIPALITY',
			label: 'Πειραιάς',
			displayName: 'Πειραιάς, Δήμος Πειραιά, Αττική',
			context: 'Περιφερειακή Ενότητα Πειραιώς, Αττική',
			hierarchy: {
				region: 'Αττική',
				regionalUnit: 'Περιφερειακή Ενότητα Πειραιά',
				municipality: null
			}
		});
		const piraeusUnit = fact({
			slug: 'perifereiaki-enotita-peiraios-attiki',
			type: 'REGIONAL_UNIT',
			label: 'Περιφερειακή Ενότητα Πειραιά',
			displayName: 'Περιφερειακή Ενότητα Πειραιώς, Αττική',
			context: 'Αττική',
			hierarchy: { region: 'Αττική', regionalUnit: null, municipality: null }
		});
		const korydallos = fact({
			slug: 'korudallos-attiki',
			type: 'MUNICIPALITY',
			label: 'Κορυδαλλός',
			displayName: 'Κορυδαλλός, Αττική',
			context: 'Περιφερειακή Ενότητα Πειραιώς, Αττική',
			hierarchy: {
				region: 'Αττική',
				regionalUnit: 'Περιφερειακή Ενότητα Πειραιά',
				municipality: null
			}
		});
		const korydallosTrikala = fact({
			slug: 'korudallos-trikala',
			type: 'SETTLEMENT',
			label: 'Κορυδαλλός',
			displayName: 'Κορυδαλλός, Τρίκαλα',
			context: 'Καλαμπάκα, Τρίκαλα',
			hierarchy: {
				region: 'Θεσσαλία',
				regionalUnit: 'Περιφερειακή Ενότητα Τρικάλων',
				municipality: 'Καλαμπάκα'
			}
		});
		const attiki = fact({
			slug: 'attiki',
			type: 'REGION',
			label: 'Αττική',
			displayName: 'Αττική',
			context: null,
			hierarchy: { region: null, regionalUnit: null, municipality: null }
		});

		function rows(facts: SearchDoctorsLocationFact[]) {
			return buildCriteriaLocationOptions(facts).map(({ label, supportingLabel }) => ({
				label,
				supportingLabel
			}));
		}

		it('S-20.1: «Πειρ» shows «Πειραιάς» with «Περιφερειακή Ενότητα Πειραιά, Αττική» underneath, then «Περιφερειακή Ενότητα Πειραιά» with «Αττική»', () => {
			expect(rows([piraeus, piraeusUnit])).toEqual([
				{ label: 'Πειραιάς', supportingLabel: 'Περιφερειακή Ενότητα Πειραιά, Αττική' },
				{ label: 'Περιφερειακή Ενότητα Πειραιά', supportingLabel: 'Αττική' }
			]);
			expect(rows([piraeus, piraeusUnit]).map((row) => row.label)).not.toContain(
				'Πειραιάς, Δήμος Πειραιά, Αττική'
			);
		});

		it('S-20.1: «Κορυ» rows read «Κορυδαλλός» with their own grey line', () => {
			expect(rows([korydallos, korydallosTrikala])).toEqual([
				{ label: 'Κορυδαλλός', supportingLabel: 'Περιφερειακή Ενότητα Πειραιά, Αττική' },
				{
					label: 'Κορυδαλλός',
					supportingLabel: 'Καλαμπάκα, Περιφερειακή Ενότητα Τρικάλων, Θεσσαλία'
				}
			]);
		});

		it('S-19.1: «Αττική» region row has no supporting line', () => {
			const option = toCriteriaLocationOption(attiki);
			expect(option.label).toBe('Αττική');
			expect(option).not.toHaveProperty('supportingLabel');
		});

		it('S-19.3: the list shows only rows returned by the server (no app-made rows)', () => {
			const answer = [piraeus, piraeusUnit];
			expect(buildCriteriaLocationOptions(answer).map((option) => option.slug)).toEqual(
				answer.map((row) => row.slug)
			);
			expect(buildCriteriaLocationOptions([])).toEqual([]);
		});
	});

	describe('ready regional-unit rows (S-18.8)', () => {
		const greek = criteriaTranslator('el');
		const english = criteriaTranslator('en');
		const serverPiraeusUnit = fact({
			slug: 'server-slug-piraeus-unit',
			type: 'REGIONAL_UNIT',
			label: 'Περιφερειακή Ενότητα Πειραιά',
			displayName: 'Περιφερειακή Ενότητα Πειραιώς, Αττική',
			hierarchy: { region: 'Αττική', regionalUnit: null, municipality: null },
			latitude: 37.94,
			longitude: 23.65
		});
		const serverCentralAthens = fact({
			slug: 'server-slug-central-athens',
			type: 'REGIONAL_UNIT',
			label: 'Κεντρικός Τομέας Αθηνών',
			displayName: 'Κεντρικός Τομέας Αθηνών, Αττική',
			hierarchy: { region: 'Αττική', regionalUnit: null, municipality: null },
			latitude: 37.98,
			longitude: 23.73
		});

		it('S-18.8: ready regional-unit rows look up the exact Greek name and stay hidden when the server has no exact match', () => {
			expect(readyRegionalUnitRows.map(toReadyLocationLookup)).toEqual([
				{ name: 'Περιφερειακή Ενότητα Πειραιά', type: 'REGIONAL_UNIT' },
				{ name: 'Κεντρικός Τομέας Αθηνών', type: 'REGIONAL_UNIT' }
			]);
			expect(readyRegionalUnitRows.map((row) => toReadyLocationLookup(row).name)).toEqual(
				readyRegionalUnitRows.map((row) => greek(row.labelKey))
			);
			expect(buildReadyLocationOptions(readyRegionalUnitRows, [null, null], greek)).toEqual([]);
		});

		it('S-18.8: a found row shows its i18n text and grey «Αττική», with the slug the server returned', () => {
			expect(
				buildReadyLocationOptions(
					readyRegionalUnitRows,
					[serverPiraeusUnit, serverCentralAthens],
					greek
				)
			).toEqual([
				{
					slug: 'server-slug-piraeus-unit',
					type: 'REGIONAL_UNIT',
					label: 'Περιφερειακή Ενότητα Πειραιά',
					supportingLabel: 'Αττική',
					latitude: 37.94,
					longitude: 23.65
				},
				{
					slug: 'server-slug-central-athens',
					type: 'REGIONAL_UNIT',
					label: 'Κεντρικός Τομέας Αθηνών',
					supportingLabel: 'Αττική',
					latitude: 37.98,
					longitude: 23.73
				}
			]);
			expect(
				buildReadyLocationOptions(
					readyRegionalUnitRows,
					[serverPiraeusUnit, serverCentralAthens],
					english
				).map(({ label, supportingLabel }) => ({ label, supportingLabel }))
			).toEqual([
				{ label: 'Piraeus Regional Unit', supportingLabel: 'Attica' },
				{ label: 'Central Athens Regional Unit', supportingLabel: 'Attica' }
			]);
		});

		it('S-18.8: a ready row the server did not find is left out, never replaced', () => {
			expect(
				buildReadyLocationOptions(readyRegionalUnitRows, [null, serverCentralAthens], greek).map(
					(option) => option.slug
				)
			).toEqual(['server-slug-central-athens']);
		});
	});
});
