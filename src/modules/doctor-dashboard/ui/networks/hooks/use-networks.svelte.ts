import { untrack } from 'svelte';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { m } from '$paraglide/messages.js';
import { createForm, type ValidatorFn } from '$shared/lib/form';
import { ApiError } from '$shared/lib/http';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSessionOptional } from '$shared/state/session';
import { getToastsOptional } from '$shared/ui/molecules/toast';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import {
	DOCTOR_LINK_FIELDS,
	doctorLinksQuery,
	readDoctorLinksFailure,
	updateDoctorLinks,
	type DoctorLinkField,
	type DoctorLinksFacts
} from '$modules/doctor-dashboard/api/links';
import {
	doctorLinkMessages,
	doctorLinkRefusal,
	doctorLinksFailureText,
	emptyDoctorLinkValues,
	normalizeDoctorLink,
	toDoctorLinks,
	toDoctorLinkValues,
	type DoctorLinkValues
} from '$modules/doctor-dashboard/lib/links';
import type { DoctorNetworksRefused, DoctorNetworksState } from '../types';

/**
 * Wave 5.2 · screen 82, the page of the four links (U-211, D-W52-67 / 70).
 * - ONE read of the session's own doctor (the base profile, of which only the four links are kept). The fields open
 *   with the FIRST answer; a read that comes back later never writes over what is typed.
 * - The rule is the server's, said before the save — and only once «Αποθήκευση» was pressed (then at every keystroke),
 *   under the field it speaks of. A field typed without `https://` gets it as it is sent.
 * - «Αποθήκευση»: the four fields in ONE write, only when the rule refuses none. Done ⇒ the cache holds the server's
 *   answer, «Το προφίλ μου» and everything under it are read again, «Αποθηκεύτηκε.», and the page closes. Nothing is
 *   shown as saved before the server says so.
 * - The server checks again: a link it refuses is said under ITS field, in the page's words, for as long as the field
 *   holds that link; a refusal that names no field is said over the buttons. What was typed STAYS. A `401` ends the
 *   session.
 */
export function useDoctorNetworks(options: { locale: () => SupportedLocale; onDone: () => void }) {
	const client = useQueryClient();
	const session = getSessionOptional();
	const toasts = getToastsOptional();

	const read = createQuery(() => ({ ...doctorLinksQuery(), enabled: browser }));
	// 🔴 Every field the page needs is READ every time (the library tells a result only what it saw read, 66's gotcha).
	const answer = $derived({ data: read.data, isError: read.isError, error: read.error });

	// The rules speak only after the first «Αποθήκευση» (`sw.js` `soShowErr`); from then on at every change.
	let checked = $state(false);
	let refused = $state<DoctorNetworksRefused>({});
	const rule =
		(field: DoctorLinkField): ValidatorFn =>
		() => {
			if (!checked) return null;
			const typed = form.values[field];
			const said = refused[field];
			const broken =
				doctorLinkRefusal(field, typed) ??
				(said && said.link === normalizeDoctorLink(typed) ? said.key : null);
			return broken ? { [broken]: true } : null;
		};
	const form = createForm<DoctorLinkValues>({
		initialValues: emptyDoctorLinkValues(),
		validators: {
			website: [rule('website')],
			facebook: [rule('facebook')],
			instagram: [rule('instagram')],
			linkedin: [rule('linkedin')]
		},
		messages: doctorLinkMessages(untrack(() => options.locale())),
		onSubmit: (values) => save(values)
	});

	// Settled ONCE, by the first answer: the fields open with the links as they were read.
	let opened = $state(false);
	$effect(() => {
		const links = answer.data;
		if (opened || links === undefined) return;
		untrack(() => {
			form.values = toDoctorLinkValues(links);
			opened = true;
		});
	});

	const state = $derived.by((): DoctorNetworksState => {
		if (opened) return 'ready';
		return answer.data === undefined && answer.isError ? 'failed' : 'loading';
	});

	// One refusal ends the session once, however often the page draws itself again.
	let ended: unknown = null;
	$effect(() => {
		const error = answer.error;
		if (!(error instanceof ApiError) || error.status !== 401 || error === ended) return;
		ended = error;
		untrack(() => session?.expire({}));
	});

	let failure = $state<string | null>(null);
	// The write's own gate: the library tells of a write that began only a timer later (the `writing` gate of the
	// sign-up's steps), so a second press in between would send the links twice.
	let saving = $state(false);

	const write = createMutation<DoctorLinksFacts | undefined, unknown, DoctorLinksFacts>(() => ({
		networkMode: 'always' as const,
		mutationFn: (links: DoctorLinksFacts) => updateDoctorLinks(links),
		onSettled: () => {
			saving = false;
		},
		onSuccess: (links) => {
			if (links) {
				client.setQueryData<DoctorLinksFacts>(doctorDashboardQueryKeys.profileLinks(), links);
			}
			void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.profile() });
			toasts?.show({ message: m.doctor_photos_saved({}, { locale: options.locale() }) });
			options.onDone();
		},
		onError: (error: unknown, sent) => {
			const { reason, fields } = readDoctorLinksFailure(error);
			if (reason === 'session') {
				// 🔴 U-84: the session ended under the page; what was typed stays for the same person.
				session?.expire({});
				return;
			}
			// 🔴 D-W52-67: the server's word on a link goes under the field that holds it.
			const said: DoctorNetworksRefused = {};
			for (const field of DOCTOR_LINK_FIELDS) {
				const refusal = fields[field];
				if (refusal) said[field] = { link: sent[field], key: refusal };
			}
			if (Object.keys(said).length > 0) {
				refused = said;
				form.validate();
				return;
			}
			failure = doctorLinksFailureText(reason, options.locale());
		}
	}));

	/** One press, one write: only a page whole by its rule leaves (the server checks it again). */
	function save(values: DoctorLinkValues) {
		if (saving || state !== 'ready') return;
		const links = toDoctorLinks(values);
		if (!links) return;
		saving = true;
		failure = null;
		write.mutate(links);
	}

	return {
		get state() {
			return state;
		},
		get form() {
			return form;
		},
		/** The words of a refused save that names no field, over the bar (`null`: none). */
		get failure() {
			return failure;
		},
		get saving() {
			return saving;
		},
		/** A field was typed in: the words over the bar go; after the first «Αποθήκευση» every field is checked again. */
		changed() {
			failure = null;
			if (checked) form.validate();
		},
		submit() {
			if (saving) return;
			checked = true;
			void form.handleSubmit();
		},
		/** «Δοκιμάστε ξανά»: the read without an answer is asked for again. */
		retry() {
			void read.refetch();
		}
	};
}

export type DoctorNetworks = ReturnType<typeof useDoctorNetworks>;
