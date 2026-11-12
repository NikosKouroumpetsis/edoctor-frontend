import { createQueries } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { doctorPublicProfileQuery, type DoctorProfile } from '$modules/doctor/api/profile';

/**
 * 🔴 D-W4-29 (P-W4 Σ-4 = Α, Σ-5): the doctors of the person's appointments on screen — ONE public profile per different
 * doctor, never one per row (the application's way), read in the browser for a member only and gone at a sign-out
 * (which doctors a person sees is a fact of their health, `personalQueryMeta`). A doctor is `undefined` while read,
 * `null` once nobody may see them (the card leaves the line out, never an id). Shared by the patient's screens (50–53
 * and 54): moved from `screens/appointments/[...path]/hooks/use-doctors` (a screen never imports another).
 *
 * 🔴 Σ1 (live check w4-live-web): the reads are told through `combine` as ONE object with ONE constant key, never as the
 * library's array. `createQueries` keeps its answer in a proxy (`@tanstack/svelte-query` 6.1.27,
 * `dist/containers.svelte.js:73-95`) that deletes the indexes that left one by one, each deletion also shortening the
 * array from its end: a set that shrinks by two or more at once deletes an index already gone and the page's
 * `$effect.pre` throws «'deleteProperty' on proxy» (the address changes, the screen does not). An object with a constant
 * key is only ever replaced; its map is built with the ids of the same call, so no doctor reads another's profile.
 */
export function useDoctorPublicProfiles(options: {
	ids: () => readonly string[];
	lang: () => string;
	enabled: () => boolean;
}) {
	const read = createQueries(() => {
		const ids = options.ids();
		const lang = options.lang();
		const enabled = browser && options.enabled();
		return {
			queries: ids.map((doctorId) => ({
				...doctorPublicProfileQuery(doctorId, lang),
				enabled
			})),
			combine: (results): { byId: Record<string, DoctorProfile | null | undefined> } => ({
				byId: Object.fromEntries(
					ids.map((doctorId, index) => {
						const query = results[index];
						return [doctorId, query?.isError ? null : query?.data];
					})
				)
			})
		};
	});

	return {
		/** One doctor's profile: `undefined` while read, `null` for nobody to show. */
		of: (doctorId: string): DoctorProfile | null | undefined => read.byId[doctorId]
	};
}
