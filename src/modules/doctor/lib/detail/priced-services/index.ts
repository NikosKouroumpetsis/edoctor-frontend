import { m } from '$paraglide/messages.js';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { DoctorServiceFacts } from '$modules/doctor/api/profile';
import { feeView } from '../labels';
import type { DoctorPricedService } from '../types';

/**
 * The priced services (the application's `buildPricedServices`), shared by «Κόστος υπηρεσιών» (its first three)
 * and its window (all): one fee rule, `feeView` (U-34.4).
 */
export function buildPricedServices(
	services: DoctorServiceFacts[],
	pricingVisible: boolean,
	locale: SupportedLocale
): DoctorPricedService[] {
	return services.map((service) => ({
		id: service.id,
		title: service.title,
		price: feeView(service.priceRange, pricingVisible, locale),
		includesBody: service.includes ?? m.doctor_service_includes_default({}, { locale }),
		...(service.note ? { descriptionBody: service.note } : {})
	}));
}
