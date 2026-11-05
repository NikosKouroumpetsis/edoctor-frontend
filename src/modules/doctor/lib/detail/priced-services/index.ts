import { m } from '$paraglide/messages.js';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { DoctorServiceFacts } from '$modules/doctor/api/profile';
import { feeView } from '../labels';
import type { DoctorPricedService } from '../types';

/**
 * One service as a row (the application's `buildPricedServices`): its short line (`sub`), the kind its icon follows
 * (U-71.2, the backend's), its fee by the one rule (`feeView`, U-34.4), «30΄» and the text under «Περιγραφή» (U-70.2 Ε2:
 * «Περιλαμβάνει» and its general phrase are gone). Every part only with data (U-34.3).
 */
export function buildPricedService(
	service: DoctorServiceFacts,
	pricingVisible: boolean,
	locale: SupportedLocale
): DoctorPricedService {
	const minutes = service.durationInMinutes;
	return {
		id: service.id,
		title: service.title,
		kind: service.kind,
		price: feeView(service.priceRange, pricingVisible, locale),
		...(service.subtitle ? { subtitle: service.subtitle } : {}),
		...(minutes
			? {
					durationLabel: m.doctor_service_duration({ minutes }, { locale }),
					durationAccessibleLabel: m.doctor_service_duration_label({ minutes }, { locale })
				}
			: {}),
		...(service.description ? { descriptionBody: service.description } : {})
	};
}

/** Shared by «Υπηρεσίες» (its first three), its page (all) and the fields of expertise. */
export function buildPricedServices(
	services: DoctorServiceFacts[],
	pricingVisible: boolean,
	locale: SupportedLocale
): DoctorPricedService[] {
	return services.map((service) => buildPricedService(service, pricingVisible, locale));
}
