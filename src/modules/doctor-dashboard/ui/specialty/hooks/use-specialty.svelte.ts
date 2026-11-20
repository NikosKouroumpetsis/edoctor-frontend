import { untrack } from 'svelte';
import { createQuery } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { ApiError } from '$shared/lib/http';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSessionOptional } from '$shared/state/session';
import {
	doctorMyPracticeLicenceQuery,
	doctorMyProfileQuery
} from '$modules/doctor-dashboard/api/profile';
import { doctorSpecializationsQuery } from '$modules/doctor-dashboard/api/specializations';
import {
	buildDoctorSpecializationLines,
	doctorPracticeLicenceLine,
	doctorSpecializationsCountText
} from '$modules/doctor-dashboard/lib/specializations';
import type { DoctorSpecialtyView } from '../types';

/**
 * Wave 5.2 · screen 80 «Ειδικότητα και εξειδικεύσεις» (U-209, U-225, D-W52-59): the page READS and writes nothing (the
 * choice of the specializations is a page of its own).
 * - «Το προφίλ μου» (`GET /doctor/me/profile`, the list's own read, looked at from here: never asked again for this
 *   page's sake): the specialty's name, whether it has a list, and the lock of the first licence.
 * - The practice licence (`GET /doctor/profile/base`): its number and its day, again whenever the page comes back to
 *   the front.
 * - The doctor's picks (`GET /doctor/profile/specializations`), ONLY for a specialty with a list, again whenever the
 *   page comes back to the front: the team's answer on a title shows without a reload.
 * A session the server no longer knows (`401`) ends here; any other failed read offers «Δοκιμάστε ξανά».
 */
export function useDoctorSpecialty(options: { locale: () => SupportedLocale }) {
	const session = getSessionOptional();
	const overview = createQuery(() => ({
		...doctorMyProfileQuery(options.locale()),
		refetchOnMount: false,
		enabled: browser
	}));
	const licence = createQuery(() => ({ ...doctorMyPracticeLicenceQuery(), enabled: browser }));
	// 🔴 Every field the page needs is READ every time (the library tells a result only what it saw read, 66's gotcha).
	const profile = $derived({
		data: overview.data,
		isError: overview.isError,
		error: overview.error
	});
	const paper = $derived({ data: licence.data, isError: licence.isError, error: licence.error });
	// 🔴 D-W52-59: no list, no specializations at all — nothing is even asked for.
	const hasCatalogue = $derived(profile.data?.sections.specialty.hasCatalogue === true);
	const chosen = createQuery(() => ({
		...doctorSpecializationsQuery(options.locale()),
		refetchOnWindowFocus: 'always' as const,
		enabled: browser && hasCatalogue
	}));
	const picks = $derived({ data: chosen.data, isError: chosen.isError, error: chosen.error });

	const view = $derived.by((): DoctorSpecialtyView => {
		const answered =
			profile.data !== undefined &&
			paper.data !== undefined &&
			(!hasCatalogue || picks.data !== undefined);
		if (answered) return 'ready';
		const failed =
			(profile.data === undefined && profile.isError) ||
			(paper.data === undefined && paper.isError) ||
			(hasCatalogue && picks.data === undefined && picks.isError);
		return failed ? 'failed' : 'loading';
	});

	// One refusal ends the session once, however often the page draws itself again.
	let ended: unknown = null;
	$effect(() => {
		const error = [profile.error, paper.error, picks.error].find(
			(entry) => entry instanceof ApiError && entry.status === 401
		);
		if (!error || error === ended) return;
		ended = error;
		untrack(() => session?.expire({}));
	});

	const lines = $derived(
		hasCatalogue && picks.data ? buildDoctorSpecializationLines(picks.data, options.locale()) : []
	);

	return {
		get view() {
			return view;
		},
		/** The specialty's name of the catalogue, as the server wrote it (U-122). */
		get specialty() {
			return profile.data?.sections.specialty.name ?? null;
		},
		/** «Αριθμός 48213 · από 12 Μαρτίου 2010»; `null` while the record holds neither. */
		get licenceLine() {
			return paper.data ? doctorPracticeLicenceLine(paper.data, options.locale()) : null;
		},
		/** The number is optional at the sign-up: without one the page says who fills it in. */
		get licenceNumberMissing() {
			return paper.data !== undefined && paper.data.number === null;
		},
		/** 🔴 D-W52-51: the first licence locked the specialty and the practice licence — the name's own rule. */
		get locked() {
			return profile.data?.sections.about.nameLocked === true;
		},
		get hasCatalogue() {
			return hasCatalogue;
		},
		/** The doctor's picks, each with the word of its status. */
		get lines() {
			return lines;
		},
		/** «2 από 3»; `null` with none («Καμία ακόμη»). */
		get countText() {
			return lines.length > 0
				? doctorSpecializationsCountText(lines.length, options.locale())
				: null;
		},
		retry() {
			if (profile.data === undefined) void overview.refetch();
			if (paper.data === undefined) void licence.refetch();
			if (hasCatalogue && picks.data === undefined) void chosen.refetch();
		}
	};
}

export type DoctorSpecialty = ReturnType<typeof useDoctorSpecialty>;
