import { describe, expect, it } from 'vitest';
import { m } from '$paraglide/messages.js';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import {
	criteriaTranslator,
	type CriteriaMessageKey
} from '$modules/search-doctors/lib/criteria-messages';
import {
	defaultSearchDoctorsCriteria,
	type SearchDoctorsCriteria
} from '$modules/search-doctors/lib/search-criteria';
import type { SearchDoctorsScope } from '$modules/search-doctors/lib/search-query';
import { buildEffectiveSearchCriteriaSummary, buildSearchResultsNavPill } from '.';

// The application's cases and guards (`lib/effective-criteria/index.unit.spec.ts`), the same titles (S-22).
// Identity translate: a static option's label resolves to its key; free words pass through.
const t = (key: CriteriaMessageKey) => key;

const geoWhereScope: SearchDoctorsScope = {
	what: { kind: 'default' },
	where: { kind: 'geo', lat: 37.98, lng: 23.72 },
	availability: 'next3Days'
};

function criteria(overrides: Partial<SearchDoctorsCriteria>): SearchDoctorsCriteria {
	return { ...defaultSearchDoctorsCriteria, ...overrides };
}

function summary(c: SearchDoctorsCriteria, scope: SearchDoctorsScope, lang = 'en') {
	const items = buildEffectiveSearchCriteriaSummary(c, scope, t, lang);
	return {
		what: items.find((item) => item.field === 'what')?.value,
		where: items.find((item) => item.field === 'where')?.value,
		availability: items.find((item) => item.field === 'availability')?.value
	};
}

const subtitleIn = (locale: SupportedLocale) => (parts: { where: string; when: string }) =>
	m.criteria_nav_pill_subtitle(parts, { locale });

describe('search-doctors::effective-criteria', () => {
	it('Κ-1: shows the shared default TERMS when what/where were defaulted (empty submit) — the catalogue’s names', () => {
		const scope: SearchDoctorsScope = {
			what: { kind: 'default' },
			where: { kind: 'default' },
			availability: 'next3Days'
		};
		expect(summary(defaultSearchDoctorsCriteria, scope, 'en')).toEqual({
			what: 'General practitioner',
			where: 'Attica',
			availability: 'criteria_option_availability_next3_days'
		});
		expect(summary(defaultSearchDoctorsCriteria, scope, 'el')).toMatchObject({
			what: 'Γενικός Γιατρός',
			where: 'Αττική'
		});
	});

	it('displays the default location for a discarded free-text where', () => {
		const scope: SearchDoctorsScope = {
			what: { kind: 'default' },
			where: { kind: 'default' },
			availability: 'next3Days'
		};
		expect(summary(criteria({ where: 'Athens' }), scope).where).toBe('Attica');
	});

	it('keeps the committed label for a professional what and a location where', () => {
		const scope: SearchDoctorsScope = {
			what: { kind: 'professional', professionalId: 'gp-1' },
			where: { kind: 'location', locationSlug: 'dimos-peiraia' },
			availability: 'today'
		};
		expect(
			summary(criteria({ what: 'Cardiology', where: 'Municipality of Piraeus' }), scope)
		).toEqual({
			what: 'Cardiology',
			where: 'Municipality of Piraeus',
			availability: 'criteria_option_availability_today'
		});
	});

	it('keeps the committed label for a service what and a free-text what', () => {
		const service: SearchDoctorsScope = {
			what: { kind: 'service', serviceSlug: 'simple-visit' },
			where: { kind: 'default' },
			availability: 'all'
		};
		expect(summary(criteria({ what: 'Simple visit' }), service).what).toBe('Simple visit');
		const text: SearchDoctorsScope = {
			what: { kind: 'text', text: 'Dr Who' },
			where: { kind: 'default' },
			availability: 'next7Days'
		};
		expect(summary(criteria({ what: 'Dr Who' }), text).what).toBe('Dr Who');
	});

	it('resolves the current-location where through the option labelKey (render-time, not a stored string)', () => {
		expect(summary(criteria({ where: 'current-location' }), geoWhereScope).where).toBe(
			'criteria_option_current_location'
		);
	});

	it('S-11.2: shows «Κοντά μου» localized (and re-translated on a language switch) for a current-location where', () => {
		expect(
			buildEffectiveSearchCriteriaSummary(
				criteria({ where: 'current-location' }),
				geoWhereScope,
				criteriaTranslator('en'),
				'en'
			).find((item) => item.field === 'where')?.value
		).toBe('Near me');
		expect(
			buildEffectiveSearchCriteriaSummary(
				criteria({ where: 'current-location' }),
				geoWhereScope,
				criteriaTranslator('el'),
				'el'
			).find((item) => item.field === 'where')?.value
		).toBe('Κοντά μου');
	});
});

describe('search-doctors::buildSearchResultsNavPill', () => {
	it('maps the «Τι» value to the title and «Πού · Πότε» to the subtitle', () => {
		const scope: SearchDoctorsScope = {
			what: { kind: 'professional', professionalId: 'gp-1' },
			where: { kind: 'location', locationSlug: 'dimos-peiraia' },
			availability: 'today'
		};
		const items = buildEffectiveSearchCriteriaSummary(
			criteria({ what: 'Cardiology', where: 'Municipality of Piraeus' }),
			scope,
			t,
			'en'
		);
		expect(buildSearchResultsNavPill(items, subtitleIn('en'))).toEqual({
			title: 'Cardiology',
			subtitle: 'Municipality of Piraeus · criteria_option_availability_today'
		});
	});

	it('uses the defaulted labels when the search fell back to defaults', () => {
		const scope: SearchDoctorsScope = {
			what: { kind: 'default' },
			where: { kind: 'default' },
			availability: 'next3Days'
		};
		const items = buildEffectiveSearchCriteriaSummary(defaultSearchDoctorsCriteria, scope, t, 'en');
		expect(buildSearchResultsNavPill(items, subtitleIn('en'))).toMatchObject({
			title: 'General practitioner',
			subtitle: 'Attica · criteria_option_availability_next3_days'
		});
	});

	it('S-11.2: renders «Κοντά μου» in the pill subtitle for a current-location where (real i18n)', () => {
		const enItems = buildEffectiveSearchCriteriaSummary(
			criteria({ where: 'current-location' }),
			geoWhereScope,
			criteriaTranslator('en'),
			'en'
		);
		expect(buildSearchResultsNavPill(enItems, subtitleIn('en')).subtitle).toContain('Near me');
		const elItems = buildEffectiveSearchCriteriaSummary(
			criteria({ where: 'current-location' }),
			geoWhereScope,
			criteriaTranslator('el'),
			'el'
		);
		expect(buildSearchResultsNavPill(elItems, subtitleIn('el')).subtitle).toContain('Κοντά μου');
		expect(buildSearchResultsNavPill(elItems, subtitleIn('el')).subtitle).not.toContain(
			'Η τοποθεσία μου'
		);
	});
});
