import { untrack } from 'svelte';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { m } from '$paraglide/messages.js';
import { ApiError } from '$shared/lib/http';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSessionOptional } from '$shared/state/session';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import {
	doctorAllowedServicesQuery,
	doctorServicesListQuery,
	readDoctorServicesFailure,
	reorderDoctorServices,
	type DoctorServiceFacts
} from '$modules/doctor-dashboard/api/services';
import {
	doctorServiceLine,
	doctorServicesFailureText,
	moveDoctorService,
	sameDoctorServiceOrder
} from '$modules/doctor-dashboard/lib/services';
import type { DoctorServiceRow, DoctorServicesView } from '../types';

/**
 * Wave 5.2 · screen 83 «Υπηρεσίες και τιμές» (U-212, D-W52-81): the page's read — the services of the session's own
 * doctor in the DOCTOR's order, titled in the page's language — and its one write, the order.
 * - 🔴 D-W52-73 / 81 **Σειρά**: the new order shows at once and goes in ONE call (`PUT …/order`); presses that come while
 *   a call is away become the next call (the last order wanted, once). A refusal puts the services back, says so, and
 *   reads them again (`DOCTOR_SERVICE_ORDER_MISMATCH`: the list changed elsewhere).
 * - Every write that ends reads «Το προφίλ μου» again, and the services of screens 70 / 72 (`servicesAll()`).
 * A session the server no longer knows (`401`) ends here.
 */
export function useDoctorServices(options: { locale: () => SupportedLocale }) {
	const client = useQueryClient();
	const session = getSessionOptional();
	const messages = () => ({ locale: options.locale() });
	const key = $derived(doctorDashboardQueryKeys.profileServices(options.locale()));

	const list = createQuery(() => ({
		...doctorServicesListQuery(options.locale()),
		enabled: browser
	}));
	// 🔴 D-W52-81 (`sw.js` `usBody`): «Προσθήκη υπηρεσίας» goes once the doctor offers every service of the catalogue.
	const allowed = createQuery(() => ({
		...doctorAllowedServicesQuery(options.locale()),
		enabled: browser
	}));
	// 🔴 Every field the page needs is READ every time (the library tells a result only what it saw read, 66's gotcha).
	const answer = $derived({ data: list.data, isError: list.isError, error: list.error });
	const complete = $derived(
		allowed.data !== undefined && allowed.data.every((option) => option.owned)
	);
	const view = $derived.by((): DoctorServicesView => {
		if (answer.data !== undefined) return 'ready';
		return answer.isError ? 'failed' : 'loading';
	});
	const services = $derived(answer.data ?? []);
	const rows = $derived<DoctorServiceRow[]>(
		services.map((service) => ({
			id: service.id,
			title: service.title,
			line: doctorServiceLine(service, options.locale())
		}))
	);

	let ended: unknown = null;
	$effect(() => {
		const error = answer.error;
		if (error === ended || !(error instanceof ApiError) || error.status !== 401) return;
		ended = error;
		untrack(() => session?.expire({}));
	});

	const stored = () => client.getQueryData<DoctorServiceFacts[]>(key) ?? [];
	/** 🔴 D-W52-81: a write ended — the profile's root (77, this list, the catalogue) and the lists of 70 / 72. */
	const refresh = () => {
		void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.profile() });
		void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.servicesAll() });
	};

	let announcement = $state('');
	let orderFailure = $state<string | null>(null);
	let kept: DoctorServiceFacts[] | null = null;
	let wanted: string[] | null = null;
	let ordering = false;

	const write = createMutation<DoctorServiceFacts[] | null, unknown, string[]>(() => ({
		networkMode: 'always' as const,
		mutationFn: (ids: string[]) => reorderDoctorServices(ids)
	}));

	/** 🔴 D-W52-81: the order shows at once; one call carries it, and the last order wanted while it was away, once. */
	async function reorder(ids: string[]) {
		const before = stored();
		if (
			sameDoctorServiceOrder(
				ids,
				before.map((service) => service.id)
			)
		)
			return;
		const next = ids.flatMap((id) => before.find((service) => service.id === id) ?? []);
		if (next.length !== before.length) return;
		orderFailure = null;
		const current = key;
		// A read that is on its way must not put the old order back over this one.
		void client.cancelQueries({ queryKey: current });
		client.setQueryData<DoctorServiceFacts[]>(current, next);
		wanted = ids;
		if (ordering) return;
		ordering = true;
		kept = before;
		try {
			while (wanted) {
				const sending: string[] = wanted;
				wanted = null;
				const answered = await write.mutateAsync(sending);
				if (answered) {
					kept = answered;
					if (!wanted) client.setQueryData<DoctorServiceFacts[]>(current, answered);
				}
			}
		} catch (error) {
			wanted = null;
			if (kept) client.setQueryData<DoctorServiceFacts[]>(current, kept);
			const reason = readDoctorServicesFailure(error);
			if (reason === 'session') session?.expire({});
			orderFailure =
				reason === 'rate-limited'
					? doctorServicesFailureText(reason, options.locale())
					: m.doctor_photos_order_failed({}, messages());
			announcement = orderFailure;
		} finally {
			ordering = false;
			kept = null;
			refresh();
		}
	}

	const moved = (index: number, count: number) =>
		m.doctor_my_services_moved({ position: index + 1, count }, messages());

	return {
		get view() {
			return view;
		},
		/** The services in the order the page shows: the server's, or the one just chosen. */
		get rows() {
			return rows;
		},
		/** The doctor offers every service of the catalogue: nothing to add. */
		get complete() {
			return complete;
		},
		/** What a reader is told of the last change of the order (`aria-live`). */
		get announcement() {
			return announcement;
		},
		get orderFailure() {
			return orderFailure;
		},
		/** 🔴 D-W52-81: the service `id` goes to the place `index` (from 0) — an arrow, a drag's end. */
		move(id: string, index: number) {
			const ids = stored().map((service) => service.id);
			const from = ids.indexOf(id);
			if (from < 0 || index < 0 || index >= ids.length || from === index) return;
			announcement = moved(index, ids.length);
			void reorder(moveDoctorService(ids, from, index));
		},
		/** A drag's end: the whole order as it was left. */
		order(ids: readonly string[], movedId: string) {
			const index = ids.indexOf(movedId);
			if (index >= 0) announcement = moved(index, ids.length);
			void reorder([...ids]);
		},
		reload() {
			void list.refetch();
		}
	};
}

export type DoctorServices = ReturnType<typeof useDoctorServices>;
