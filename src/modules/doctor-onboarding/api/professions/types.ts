/**
 * One specialty of the catalogue (`GET /professional/professionals`, contract §5 B-6): its id and its name in each
 * language the server keeps, `null` where a translation is missing; the page picks the reader's. Type-only.
 */
export type DoctorOnboardingProfession = {
	professionalId: string;
	names: { el: string | null; en: string | null };
};
