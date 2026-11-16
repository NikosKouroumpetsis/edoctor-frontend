<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { getDoctorStandingOptional } from '$shared/state/doctor-standing';
	import { getSessionOptional } from '$shared/state/session';
	import { MenuRow } from '$shared/ui/molecules/menu-row';
	import { ModePill } from '$shared/ui/molecules/mode-pill';
	import { NameCard } from '$shared/ui/molecules/name-card';
	import { Button } from '$shared/ui/primitives/button';
	import { buildProfileIdentity } from '$modules/profile/lib/identity';
	import { buildProfileMenu } from '$modules/profile/lib/menu';
	import { profileViewerOf } from '$modules/profile/lib/viewer';
	import DoctorCard from '../components/doctor-card.svelte';
	import Skeleton from '../components/skeleton.svelte';
	import type { ProfileTabProps } from '../types';

	let { locale, hrefOf, onRow, doctorHref, doctorModeHref, headerAction }: ProfileTabProps =
		$props();

	const options = $derived({ locale });
	// The page's server knows nobody (U-80.1 Ε6): it draws the wait, and the browser fills it in.
	const session = getSessionOptional();
	const viewer = $derived(profileViewerOf(session));
	const isMember = $derived(viewer === 'member');
	const sections = $derived(buildProfileMenu(options, { member: isMember }));
	const identity = $derived(isMember ? buildProfileIdentity(session?.member) : null);
	let signingOut = $state(false);
	// 🔴 Wave 5.1 · screen 64 (U-185.1, U-183.5, D-W51-16): the doctor-dashboard module's one read, drawn here — a guest
	// and anyone without a completed registration read «Είστε γιατρός;» as before; a completed one without a licence «Η
	// αίτησή σας ελέγχεται»; a licence of the marketplace no card and the pill «Λειτουργία γιατρού» (below 744); a till's
	// licence alone neither on the web. A member waits for the answer (or this device's memory) before the card shows,
	// so it never changes under the eye.
	const doctor = getDoctorStandingOptional();
	const doctorKind = $derived(isMember ? (doctor?.kind ?? 'none') : 'none');
	const doctorDecided = $derived(!isMember || !doctor || doctor.known || doctor.hinted);
	const showsDoctorCard = $derived(
		doctorDecided && (doctorKind === 'none' || doctorKind === 'pending')
	);
	const showsModePill = $derived(
		isMember && Boolean(doctorModeHref) && (doctor?.canEnterDoctorMode ?? false)
	);

	function enterDoctorMode(event: MouseEvent) {
		if (!doctor) return;
		event.preventDefault();
		void doctor.switchTo('DOCTOR');
	}

	// One press, one sign-out: the row takes no second one while the first is on its way.
	async function signOut() {
		if (signingOut) return;
		signingOut = true;
		try {
			await session?.signOut();
		} finally {
			signingOut = false;
		}
	}
</script>

<svelte:head>
	<title>{m.profile_page_title({}, options)} | {m.brand_name({}, options)}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<!-- 🔴 Wave 4.5 · screen 56 «Προφίλ» (record §5.1, U-164; `56-profile/prof.js` `page()`, `prof.css`). Below 744 the
     application's tab, from 744 the same one column in the middle, for a direct link (the usual way there is the menu
     at the top right). A MEMBER: the title · the name card (not pressed, Ε2 Β) · «Είστε γιατρός;» as a card (Ε5 Α) · the
     rows, «Αποσύνδεση» the last one (Ε3 Α) — no line of words, no big button (Ε1 Α). A GUEST as before: the title, the
     words, «Συνδεθείτε ή εγγραφείτε», then the same card and its rows. 🔴 U-164.1: nothing of a doctor's here. -->
<main
	data-testid="profile-page"
	data-viewer={viewer}
	class="min-h-page bg-card px-gutter-sm pt-3 pb-results-list-end tablet:pt-section tablet:pb-pane-inset-lg"
>
	<div class="mx-auto flex w-full max-w-form flex-col">
		<div class="flex min-h-touch flex-row items-center justify-between gap-3">
			<h1 class="text-heading-md font-semibold text-foreground tablet:text-heading-xl">
				{m.profile_page_title({}, options)}
			</h1>
			{#if isMember}
				{@render headerAction?.()}
			{/if}
		</div>
		{#if viewer === 'waiting'}
			<Skeleton label={m.profile_page_title({}, options)} />
		{:else}
			{#if isMember}
				{#if identity}
					<div class="mt-3">
						<NameCard
							initial={identity.initial}
							title={identity.title}
							line={identity.line}
							testId="profile-name"
						/>
					</div>
				{/if}
			{:else}
				<p
					data-testid="profile-description"
					class="mt-3 text-title-xs leading-relaxed text-muted-foreground tablet:max-w-text tablet:text-title-md"
				>
					{m.profile_guest_description({}, options)}
				</p>
				<Button
					tone="contrast"
					bordered={false}
					label={m.profile_guest_cta({}, options)}
					data-testid="profile-cta"
					class="mt-6 w-full px-cta-inline py-3.5 tablet:py-4"
					textClass="text-title-xs tablet:text-title-sm"
					onclick={() => session?.requireSignIn()}
				/>
			{/if}
			{#if showsDoctorCard}
				<div class="mt-3.5">
					<DoctorCard {locale} href={doctorHref} pending={doctorKind === 'pending'} />
				</div>
			{/if}
			<div class="mt-5 flex flex-col gap-2">
				{#each sections as section, index (section.id)}
					<div
						data-testid={`profile-section-${section.id}`}
						class={['flex flex-col', index > 0 && 'border-t border-line pt-2']}
					>
						{#each section.rows as row (row.id)}
							{#if row.id === 'sign-out'}
								<MenuRow
									icon={row.icon}
									label={row.label}
									chevron={false}
									disabled={signingOut}
									onclick={signOut}
									testId="profile-menu-sign-out"
								/>
							{:else}
								<MenuRow
									icon={row.icon}
									label={row.label}
									href={hrefOf(row.id)}
									onclick={() => onRow(row.id)}
									testId={`profile-menu-${row.id}`}
								/>
							{/if}
						{/each}
					</div>
				{/each}
			</div>
		{/if}
	</div>
	{#if showsModePill && doctorModeHref}
		<ModePill
			label={m.doctor_mode_doctor({}, options)}
			href={doctorModeHref}
			onclick={enterDoctorMode}
			disabled={doctor?.switching !== null && doctor?.switching !== undefined}
			testId="profile-doctor-mode"
		/>
	{/if}
</main>
