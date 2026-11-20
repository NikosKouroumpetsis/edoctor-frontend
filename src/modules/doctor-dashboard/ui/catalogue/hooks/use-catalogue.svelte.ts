import { untrack } from 'svelte';
import { createQuery } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { ApiError } from '$shared/lib/http';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSessionOptional } from '$shared/state/session';
import { doctorAllowedServicesQuery } from '$modules/doctor-dashboard/api/services';
import { buildDoctorServiceCatalogueRows } from '$modules/doctor-dashboard/lib/services';
import type { DoctorServiceCatalogueView } from '../types';

/**
 * Wave 5.2 · screen 83 «Νέα υπηρεσία» (U-212.1, D-W52-81): the page READS and writes nothing. ONE read — the catalogue of
 * the specialty of the session's doctor (`GET /doctor-service/allowed-services`) — and only the services the doctor does
 * NOT offer yet, in the server's order, each with its usual length. A session the server no longer knows (`401`) ends
 * here; any other failed read offers «Δοκιμάστε ξανά».
 */
export function useDoctorServiceCatalogue(options: { locale: () => SupportedLocale }) {
	const session = getSessionOptional();
	const read = createQuery(() => ({
		...doctorAllowedServicesQuery(options.locale()),
		refetchOnWindowFocus: 'always' as const,
		enabled: browser
	}));
	const answer = $derived({ data: read.data, isError: read.isError, error: read.error });
	const view = $derived.by((): DoctorServiceCatalogueView => {
		if (answer.data !== undefined) return 'ready';
		return answer.isError ? 'failed' : 'loading';
	});

	let ended: unknown = null;
	$effect(() => {
		const error = answer.error;
		if (!(error instanceof ApiError) || error.status !== 401 || error === ended) return;
		ended = error;
		untrack(() => session?.expire({}));
	});

	const rows = $derived(buildDoctorServiceCatalogueRows(answer.data ?? [], options.locale()));

	return {
		get view() {
			return view;
		},
		/** The services of the specialty the doctor does not offer yet, «Συνήθως 20′» under each. */
		get rows() {
			return rows;
		},
		retry() {
			void read.refetch();
		}
	};
}

export type DoctorServiceCatalogue = ReturnType<typeof useDoctorServiceCatalogue>;
