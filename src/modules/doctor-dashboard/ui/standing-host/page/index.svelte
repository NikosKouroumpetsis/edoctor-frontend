<script lang="ts">
	import { untrack } from 'svelte';
	import { createQuery, useQueryClient } from '@tanstack/svelte-query';
	import type { Pathname } from '$app/types';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '$paraglide/messages.js';
	import { deLocalizeHref, localizeHref } from '$paraglide/runtime';
	import { ApiError } from '$shared/lib/http';
	import { getPageLocale } from '$shared/preferences/i18n/page-locale';
	import { personalQueryMeta } from '$shared/query';
	import {
		DoctorStanding,
		setDoctorStanding,
		type DoctorMode,
		type DoctorStandingFacts,
		type DoctorStandingHint
	} from '$shared/state/doctor-standing';
	import { getSessionOptional } from '$shared/state/session';
	import { ModeTransition } from '$shared/ui/organisms/mode-transition';
	import {
		doctorDashboardQuery,
		setDoctorDashboardMode
	} from '$modules/doctor-dashboard/api/dashboard';
	import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
	import {
		forgetDoctorModeHint,
		readDoctorModeHint,
		writeDoctorModeHint
	} from '$modules/doctor-dashboard/lib/hint';
	import { doctorTodayPath } from '$modules/doctor-dashboard/lib/paths';
	import { toDoctorStandingFacts } from '$modules/doctor-dashboard/lib/standing';
	import { transitionLeft } from '../lib/timing';
	import type { DoctorStandingHostProps } from '../types';

	let { children }: DoctorStandingHostProps = $props();

	const client = useQueryClient();
	const session = getSessionOptional();
	const isMember = $derived(session?.isMember ?? false);
	const locale = $derived(getPageLocale(page.url));
	const options = $derived({ locale });
	const href = (path: string) => resolve(localizeHref(path, { locale }) as Pathname);

	// 🔴 D-W51-10: «who am I as a doctor», only for a member — a guest, and a session not known yet, ask the server
	// NOTHING (`enabled` goes false at a sign-out too). Every signed-in page reads it; nothing else asks it again.
	const read = createQuery(() => ({ ...doctorDashboardQuery(), enabled: browser && isMember }));
	const facts = $derived<DoctorStandingFacts | null | undefined>(
		!session || session.status === 'guest'
			? null
			: isMember && read.data
				? toDoctorStandingFacts(read.data)
				: undefined
	);
	// 🔴 D-W51-19: the device's memory, read in the browser once the page is up (never on the server: the first paint
	// stays the server's, the CSS of `<html data-doctor-mode>` having decided the bar before it).
	let hint = $state<DoctorStandingHint | null>(null);
	$effect(() => {
		hint = readDoctorModeHint();
	});

	let switching = $state<DoctorMode | null>(null);
	let failures = $state(0);
	// 🔴 64 «Η μνήμη»: the mode the account opens in is decided once — on arrival, and again after a sign-in.
	let memoryDue = true;

	// The answer is what this device remembers next time (the kind and the mode, nothing of the person), and what the
	// bar's CSS reads; a guest — a sign-out, an ended or deleted account — leaves nothing behind (D-W51-19).
	$effect(() => {
		const known = facts;
		if (!browser || known === undefined) return;
		untrack(() => {
			const root = document.documentElement;
			if (known === null) {
				forgetDoctorModeHint();
				delete root.dataset.doctorMode;
				return;
			}
			writeDoctorModeHint({ kind: known.kind, lastMode: known.lastMode });
			if (known.kind === 'doctor') root.dataset.doctorMode = 'doctor';
			else delete root.dataset.doctorMode;
		});
	});

	// 🔴 64 «Η μνήμη» (D-W51-19): on the home — after the sign-in too — a doctor who left in the doctor's mode opens it
	// again; every other page (a doctor's profile, the articles, a search from a link) stays the patient's. The sign-in
	// page waits for the address it returns to.
	$effect(() => {
		const known = facts;
		const path = deLocalizeHref(page.url.pathname);
		const search = page.url.search;
		if (known === null) {
			memoryDue = true;
			return;
		}
		if (known === undefined || !memoryDue || path === '/login') return;
		memoryDue = false;
		if (path === '/' && !search && known.kind === 'doctor' && known.lastMode === 'DOCTOR') {
			untrack(() => void goto(href(doctorTodayPath), { replaceState: true }));
		}
	});

	/**
	 * «Λειτουργία γιατρού» / «Λειτουργία ασθενή» (U-185.3): the transition for about a second, the mode kept on the server
	 * (D-W51-11), then that mode's page — the doctor's «Σήμερα», the patient's home. A refusal moves nobody and the frame
	 * says so; a `401` opens the sign-in over the page. One switch at a time.
	 */
	async function switchTo(mode: DoctorMode): Promise<boolean> {
		if (switching) return false;
		switching = mode;
		memoryDue = false;
		const startedAt = Date.now();
		try {
			const answer = await setDoctorDashboardMode(mode);
			if (!answer) throw new ApiError('Not a doctor dashboard', 0, '/doctor/me/dashboard/mode');
			client.setQueryDefaults(doctorDashboardQueryKeys.all, { meta: personalQueryMeta });
			client.setQueryData(doctorDashboardQueryKeys.standing(), answer);
			await new Promise((done) => setTimeout(done, transitionLeft(startedAt, Date.now())));
			await goto(href(mode === 'DOCTOR' ? doctorTodayPath : '/'));
			return true;
		} catch (error) {
			if (error instanceof ApiError && error.status === 401) session?.expire({});
			else {
				failures += 1;
				// A licence revoked meanwhile: the standing is read again, so the switch goes away where it no longer is.
				void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.standing() });
			}
			return false;
		} finally {
			switching = null;
		}
	}

	setDoctorStanding(
		new DoctorStanding({
			facts: () => facts,
			hint: () => hint,
			failed: () => (isMember && read.isError) || (session?.readFailed ?? false),
			retry: () => {
				if (session?.readFailed) void session.retryRead();
				else void read.refetch();
			},
			switchTo,
			switching: () => switching,
			failures: () => failures
		})
	);
</script>

{#snippet mark()}
	<span
		class="grid size-control-xl place-items-center rounded-lg bg-primary text-heading-md font-bold text-primary-foreground"
		>e+</span
	>
{/snippet}

<!-- Wave 5.1 · screens 64 / 65 (D-W51-10): the ONE read behind «Λειτουργία γιατρού», «Η αίτησή σας ελέγχεται» and the
     doctor's frame, for the whole site — the frames, the «Προφίλ» and the sign-up draw it and know nothing of this
     module — and the transition of a switch, above every page. -->
{@render children()}

<ModeTransition
	open={switching !== null}
	label={switching === 'PATIENT'
		? m.doctor_mode_to_patient({}, options)
		: m.doctor_mode_to_doctor({}, options)}
	{mark}
	testId="doctor-mode-transition"
/>
