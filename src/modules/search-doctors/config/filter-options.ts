import type { MarketplacePaymentOption } from '$modules/search-doctors/api/marketplace/types';
import type { IoniconName } from '$shared/ui/icons/ionicon';

/**
 * The filters' toggles in their fixed order with their glyphs, the application's `config/filter-options` (the same
 * values, order and Ionicons): the payment methods and the office's access. Their words are the page's catalog.
 */
export type FilterOptionConfig<Value extends string = string> = { value: Value; icon: IoniconName };

export const paymentOptionConfigs: FilterOptionConfig<MarketplacePaymentOption>[] = [
	{ value: 'CASH', icon: 'cash-outline' },
	{ value: 'CARD', icon: 'card-outline' },
	{ value: 'IRIS', icon: 'phone-portrait-outline' },
	{ value: 'ONLINE_DOCTOR_PAY', icon: 'globe-outline' },
	{ value: 'ONLINE_OFFICE_PAY', icon: 'business-outline' },
	{ value: 'STUDENT_CARD', icon: 'school-outline' },
	{ value: 'UNEMPLOYMENT_CARD', icon: 'document-text-outline' }
];

/** The office's access (`DISABILITY_ACCESS`, `PARKING`: the facets' `amenities` values). */
export type AmenityValue = 'DISABILITY_ACCESS' | 'PARKING';

export const amenityOptionConfigs: FilterOptionConfig<AmenityValue>[] = [
	{ value: 'DISABILITY_ACCESS', icon: 'accessibility-outline' },
	{ value: 'PARKING', icon: 'car-outline' }
];
