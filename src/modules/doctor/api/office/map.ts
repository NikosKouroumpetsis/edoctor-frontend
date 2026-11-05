import type {
	DoctorPublicMarketplaceOfficeDetailView,
	DoctorPublicMarketplaceOfficeResponseView
} from '$shared/lib/api-client';
import { resolveMediaUrl } from '$shared/lib/http';
import {
	mapDoctorOfficeFacts,
	type DoctorOfficeFacts,
	type DoctorOfficeImageFacts,
	type DoctorOfficeWeeklyHoursFacts
} from '$modules/doctor/api/profile';

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
 * (P-B §7: the photos, the week, «Πώς θα έρθετε»). The answer's availability summary is not read: the slots are
 * `api/availability`'s (one source of «free»).
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
	return {
		...facts,
		officeId,
		...(photos.length > 0 ? { images: photos } : {}),
		...(week ? { weeklyHours: week } : {}),
		...(gettingThere ? { gettingThere } : {})
	};
}
