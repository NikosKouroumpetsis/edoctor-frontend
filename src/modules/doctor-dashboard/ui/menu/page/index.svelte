<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { m } from '$paraglide/messages.js';
	import { localizeHref } from '$paraglide/runtime';
	import { getDoctorStandingOptional } from '$shared/state/doctor-standing';
	import { getSessionOptional } from '$shared/state/session';
	import { MenuRow } from '$shared/ui/molecules/menu-row';
	import { ModePill } from '$shared/ui/molecules/mode-pill';
	import { NameCard } from '$shared/ui/molecules/name-card';
	import { buildDoctorMenuGroups, type DoctorMenuRowId } from '$modules/doctor-dashboard/lib/menu';
	import { doctorFramePaths, doctorPatientsPath } from '$modules/doctor-dashboard/lib/paths';
	import type { DoctorMenuProps } from '../types';

	let { locale, headerAction }: DoctorMenuProps = $props();

	const options = $derived({ locale });
	const href = (path: string) => resolve(localizeHref(path, { locale }) as Pathname);
	const session = getSessionOptional();
	const standing = getDoctorStandingOptional();
	// Round 2 (U-81.2, `76-menu` m-51): the page's rows — no «Ειδοποιήσεις» (the bell is at the title), the «Προφίλ»'s words.
	const groups = $derived(buildDoctorMenuGroups(locale, 'page'));
	const card = $derived(standing?.card ?? null);
	const name = $derived(
		[card?.firstName, card?.lastName].filter((part): part is string => Boolean(part)).join(' ') ||
			null
	);
	const rowPaths: Record<Exclude<DoctorMenuRowId, 'sign-out'>, string> = {
		notifications: doctorFramePaths.notifications,
		patients: doctorPatientsPath,
		'account-settings': doctorFramePaths.accountSettings,
		help: doctorFramePaths.help,
		terms: doctorFramePaths.terms
	};
	let signingOut = $state(false);

	// One press, one sign-out (the «Προφίλ»'s way): the row takes no second one while the first is on its way.
	async function signOut() {
		if (signingOut) return;
		signingOut = true;
		try {
			await session?.signOut();
		} finally {
			signingOut = false;
		}
	}

	function patientMode(event: MouseEvent) {
		if (!standing) return;
		event.preventDefault();
		void standing.switchTo('PATIENT');
	}
</script>

<svelte:head>
	<title>{m.doctor_dashboard_menu({}, options)} | {m.brand_name({}, options)}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<!-- 🔴 Screen 76 as 5.1 ships it on the web (D-W51-04, `76-menu` `?stage=51`, `m-51`): the «Προφίλ» of screen 56 for the
     doctor — «Μενού» with the bell, the name card with the specialty of the catalogue (U-122; NOT pressed, U-164.1), the rows of the doctor's ☰
     and, below 744, the pill «Λειτουργία ασθενή». From 744 the same page in the middle of the screen (U-167). Never «Οι
     συγγενείς μου» (U-186.1). -->
<main
	data-testid="doctor-menu"
	class="min-h-page px-gutter-sm pt-3 pb-results-list-end tablet:pt-section tablet:pb-pane-inset-lg"
>
	<div class="mx-auto flex w-full max-w-form flex-col">
		<!-- The «Προφίλ»'s title row (screen 56): «Μενού» and, at its end, what the screen hands in — the bell of screen 63
		     below 744 (since step 11 the doctor's list, screen 75), with its dot while something of his is new. -->
		<div class="flex min-h-touch flex-row items-center justify-between gap-3">
			<h1 class="text-heading-md font-semibold text-foreground tablet:text-heading-xl">
				{m.doctor_dashboard_menu({}, options)}
			</h1>
			{@render headerAction?.()}
		</div>
		{#if card}
			<div class="mt-3">
				<NameCard
					initial={card.firstName?.slice(0, 1).toUpperCase() ?? null}
					title={name}
					line={card.specialtyName}
					testId="doctor-menu-name"
				/>
			</div>
		{/if}
		<div class="mt-5 flex flex-col gap-2">
			{#each groups as group, index (group[0]?.id ?? index)}
				<div
					data-testid={`doctor-menu-group-${index}`}
					class={['flex flex-col', index > 0 && 'border-t border-line pt-2']}
				>
					{#each group as row (row.id)}
						{#if row.id === 'sign-out'}
							<MenuRow
								icon={row.icon}
								label={row.label}
								chevron={false}
								disabled={signingOut}
								onclick={signOut}
								testId="doctor-menu-sign-out"
							/>
						{:else}
							<MenuRow
								icon={row.icon}
								label={row.label}
								href={href(rowPaths[row.id])}
								testId={`doctor-menu-${row.id}`}
							/>
						{/if}
					{/each}
				</div>
			{/each}
		</div>
	</div>
	<ModePill
		label={m.doctor_mode_patient({}, options)}
		href={href(doctorFramePaths.home)}
		onclick={patientMode}
		testId="doctor-menu-patient-mode"
	/>
</main>
