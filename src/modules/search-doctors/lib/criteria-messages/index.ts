import { m } from '$paraglide/messages.js';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/**
 * The words the search criteria name by key (the application's `TranslationKey`s of `searchDoctors.criteria.*`, in
 * the web's catalog): the libs carry the key, the page says it in its language through `translateCriteria`.
 */
const criteriaMessages = {
	criteria_option_internal_medicine: m.criteria_option_internal_medicine,
	criteria_option_pediatrics: m.criteria_option_pediatrics,
	criteria_option_dentistry: m.criteria_option_dentistry,
	criteria_option_specialty_supporting: m.criteria_option_specialty_supporting,
	criteria_option_current_location: m.criteria_option_current_location,
	criteria_option_current_location_supporting: m.criteria_option_current_location_supporting,
	criteria_option_attiki: m.criteria_option_attiki,
	criteria_option_region_supporting: m.criteria_option_region_supporting,
	criteria_option_piraeus_regional_unit: m.criteria_option_piraeus_regional_unit,
	criteria_option_central_athens_regional_unit: m.criteria_option_central_athens_regional_unit,
	criteria_option_availability_today: m.criteria_option_availability_today,
	criteria_option_availability_next3_days: m.criteria_option_availability_next3_days,
	criteria_option_availability_next7_days: m.criteria_option_availability_next7_days,
	criteria_option_availability_anytime: m.criteria_option_availability_anytime,
	criteria_group_specialties: m.criteria_group_specialties,
	criteria_group_services: m.criteria_group_services,
	criteria_group_doctors: m.criteria_group_doctors,
	search_what_label: m.search_what_label,
	search_where_label: m.search_where_label,
	search_when_label: m.search_when_label,
	criteria_what_empty: m.criteria_what_empty,
	criteria_where_empty: m.criteria_where_empty,
	criteria_when_empty: m.criteria_when_empty
} as const;

/** A key of the criteria's words (the application's `TranslationKey` of a criteria option or group). */
export type CriteriaMessageKey = keyof typeof criteriaMessages;

/** Says one key in `locale`. */
export function translateCriteria(key: CriteriaMessageKey, locale: SupportedLocale): string {
	return criteriaMessages[key]({}, { locale });
}

/** The translator a lib takes (`t`), bound to the page's language. */
export function criteriaTranslator(locale: SupportedLocale): (key: CriteriaMessageKey) => string {
	return (key) => translateCriteria(key, locale);
}
