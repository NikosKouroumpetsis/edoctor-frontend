import type {
	DoctorPublicMarketplaceOfficeDetailView,
	DoctorPublicMarketplaceOfficeResponseView,
	OfficeParkingKind
} from '$shared/lib/api-client';
import { resolveMediaUrl } from '$shared/lib/http';
import {
	mapDoctorOfficeFacts,
	type DoctorOfficeAmenitiesFacts,
	type DoctorOfficeFacts,
	type DoctorOfficeImageFacts,
	type DoctorOfficeParkingKind,
	type DoctorOfficeWeeklyHoursFacts
} from '$modules/doctor/api/profile';

/** The wire's kinds of parking ⇒ the app's ids (a new kind of the server's does not compile, W-4). */
const PARKING_KINDS = {
	PRIVATE: 'private',
	PUBLIC_NEARBY: 'public-nearby',
	STREET: 'street'
} as const satisfies Record<OfficeParkingKind, DoctorOfficeParkingKind>;

/**
 * 🔴 P-W3 §3.5 (Σ-22, D-W3-19, the application's `mapAmenities`): the office's details as the server keeps them (Ε6),
 * each only under its parent — the kinds under parking, the accessible toilet and space under step-free access, an
 * elevator off a known floor other than the ground. A kind this page does not know is left out (`Object.hasOwn`, never
 * `in`), a missing or broken group reads as none, and an office with no detail has none at all.
 */
function amenities(
	office: DoctorPublicMarketplaceOfficeDetailView
): DoctorOfficeAmenitiesFacts | undefined {
	const group: Partial<DoctorPublicMarketplaceOfficeDetailView['amenities']> =
		typeof office.amenities === 'object' && office.amenities !== null ? office.amenities : {};
	const access = office.disabilityAccess === true;
	const kinds: unknown[] =
		office.parking === true && Array.isArray(group.parkingKinds) ? group.parkingKinds : [];
	const facts: DoctorOfficeAmenitiesFacts = {
		parkingKinds: Object.values(PARKING_KINDS).filter((id) =>
			kinds.some(
				(kind) =>
					typeof kind === 'string' &&
					Object.hasOwn(PARKING_KINDS, kind) &&
					PARKING_KINDS[kind as OfficeParkingKind] === id
			)
		),
		accessibleToilet: access && group.accessibleToilet === true,
		accessibleParking: access && group.accessibleParking === true,
		elevator:
			typeof office.floor === 'number' &&
			Number.isFinite(office.floor) &&
			office.floor !== 0 &&
			group.elevator === true,
		nearPublicTransport: group.nearPublicTransport === true
	};
	const any =
		facts.parkingKinds.length > 0 ||
		facts.accessibleToilet ||
		facts.accessibleParking ||
		facts.elevator ||
		facts.nearPublicTransport;
	return any ? facts : undefined;
}

/** The office's photos, absolute, in the server's order; one without any address is left out. */
function images(office: DoctorPublicMarketplaceOfficeDetailView): DoctorOfficeImageFacts[] {
	return (office.images ?? []).flatMap((image) => {
		const url = image.mediumSizeUrl?.trim() || image.lgSizeUrl?.trim() || image.smSizeUrl?.trim();
		if (!url) return [];
		const alt = image.alt?.trim();
		return [
			{
				id: image.id,
				url: resolveMediaUrl(url),
				largeUrl: resolveMediaUrl(image.lgSizeUrl?.trim() || url),
				thumbUrl: resolveMediaUrl(image.smSizeUrl?.trim() || url),
				...(alt ? { alt } : {})
			}
		];
	});
}

/** The week as sent: a day without ranges is a closed day, and a week with none at all is no week (U-34.3). */
function weeklyHours(
	office: DoctorPublicMarketplaceOfficeDetailView
): DoctorOfficeWeeklyHoursFacts | undefined {
	const week = office.weeklyHours;
	if (!week || !week.days.some((day) => day.ranges.length > 0)) return undefined;
	return { timezone: week.timezone, days: week.days };
}

/**
 * One office's answer as its FACTS (U-39.1, the profile's own mapper for the same view) and what only this read has
 * (P-B §7: the photos, the week, «Πώς θα έρθετε»; P-W3 §3.5: the office's details). The answer's availability summary
 * is not read: the slots are `api/availability`'s (one source of «free»). D-103: no read of its own, this one's.
 */
export function mapDoctorOffice(
	data: DoctorPublicMarketplaceOfficeResponseView,
	officeId: string
): DoctorOfficeFacts | null {
	const office = data.office;
	if (!office) return null;
	const facts = mapDoctorOfficeFacts(office);
	if (!facts) return null;
	const photos = images(office);
	const week = weeklyHours(office);
	const gettingThere = office.gettingThere?.trim();
	const details = amenities(office);
	return {
		...facts,
		officeId,
		...(photos.length > 0 ? { images: photos } : {}),
		...(week ? { weeklyHours: week } : {}),
		...(gettingThere ? { gettingThere } : {}),
		...(details ? { amenities: details } : {})
	};
}
