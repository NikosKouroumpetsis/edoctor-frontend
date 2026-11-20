import { untrack } from 'svelte';
import { createQuery } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { ApiError } from '$shared/lib/http';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSessionOptional } from '$shared/state/session';
import { doctorLanguagesQuery } from '$modules/doctor-dashboard/api/languages';
import { doctorLinksQuery } from '$modules/doctor-dashboard/api/links';
import { buildDoctorLanguagesSummary } from '$modules/doctor-dashboard/lib/languages';
import {
	buildDoctorLinkLines,
	doctorLinkNames,
	doctorLinksCountText
} from '$modules/doctor-dashboard/lib/links';
import type { DoctorLanguagesView } from '../types';

/**
 * Wave 5.2 · screen 82 «Γλώσσες και κοινωνικά δίκτυα» (U-211, D-W52-69 / 70): the page READS and writes nothing (the
 * languages and the links are each changed on a page of their own). Two reads of the session's own doctor — the
 * languages (`GET /doctor/profile/speak-languages`, named in the page's language) and the four links (`GET
 * /doctor/profile/base`, of which only they are kept) — asked again whenever the page comes back to the front (a
 * change made in another tab shows without a reload). A session the server no longer knows (`401`) ends here; any
 * other failed read offers «Δοκιμάστε ξανά».
 */
export function useDoctorLanguages(options: { locale: () => SupportedLocale }) {
	const session = getSessionOptional();
	const spoken = createQuery(() => ({
		...doctorLanguagesQuery(options.locale()),
		refetchOnWindowFocus: 'always' as const,
		enabled: browser
	}));
	const kept = createQuery(() => ({
		...doctorLinksQuery(),
		refetchOnWindowFocus: 'always' as const,
		enabled: browser
	}));
	// 🔴 Every field the page needs is READ every time (the library tells a result only what it saw read, 66's gotcha).
	const languages = $derived({ data: spoken.data, isError: spoken.isError, error: spoken.error });
	const links = $derived({ data: kept.data, isError: kept.isError, error: kept.error });

	const view = $derived.by((): DoctorLanguagesView => {
		if (languages.data !== undefined && links.data !== undefined) return 'ready';
		const failed =
			(languages.data === undefined && languages.isError) ||
			(links.data === undefined && links.isError);
		return failed ? 'failed' : 'loading';
	});

	// One refusal ends the session once, however often the page draws itself again.
	let ended: unknown = null;
	$effect(() => {
		const error = [languages.error, links.error].find(
			(entry) => entry instanceof ApiError && entry.status === 401
		);
		if (!error || error === ended) return;
		ended = error;
		untrack(() => session?.expire({}));
	});

	const summary = $derived(
		languages.data ? buildDoctorLanguagesSummary(languages.data, options.locale()) : null
	);
	const lines = $derived(links.data ? buildDoctorLinkLines(links.data, options.locale()) : []);

	return {
		get view() {
			return view;
		},
		/** «Ελληνικά, Αγγλικά» over «2 γλώσσες»; `null` for none («Καμία ακόμη»). */
		get summary() {
			return summary;
		},
		/** The fields that hold a link: «Ιστοσελίδα · example.gr». */
		get lines() {
			return lines;
		},
		/** «2 από 4»; `null` with none («Κανένα ακόμη»). */
		get linksCountText() {
			return lines.length > 0 ? doctorLinksCountText(lines.length, options.locale()) : null;
		},
		/** «Ιστοσελίδα, Facebook, Instagram, LinkedIn»: under «Κανένα ακόμη». */
		get linkNames() {
			return doctorLinkNames(options.locale());
		},
		retry() {
			if (languages.data === undefined) void spoken.refetch();
			if (links.data === undefined) void kept.refetch();
		}
	};
}

export type DoctorLanguages = ReturnType<typeof useDoctorLanguages>;
