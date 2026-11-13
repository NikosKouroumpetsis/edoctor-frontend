<script lang="ts">
	import { untrack } from 'svelte';
	import { online } from 'svelte/reactivity/window';
	import { m } from '$paraglide/messages.js';
	import { getSessionOptional } from '$shared/state/session';
	import DeletionFlow, {
		DeletionDone,
		useAccountDeletion
	} from '$modules/account/ui/deletion-flow';
	import { appointmentsViewerOf } from '$modules/appointments/lib/list';
	import Relatives, { useRelativeUpcoming } from '$modules/appointments/ui/relatives';
	import Security from '$modules/auth/ui/security';
	import { useDoctorPublicProfiles } from '$modules/doctor/ui/public-profiles';
	import { NotificationBell } from '$modules/notifications/ui/inbox';
	import NotificationSettings from '$modules/notifications/ui/settings';
	import { profileViewerOf } from '$modules/profile/lib/viewer';
	import Personal from '$modules/profile/ui/personal';
	import Privacy from '$modules/profile/ui/privacy';
	import Settings from '$modules/profile/ui/settings';
	import ProfileTab from '$modules/profile/ui/tab';
	import { ConsentTools, useConsentSummary } from '$modules/shell/ui/consent-prompt';
	import { usePersonalPorts, useProfileScreen } from '../hooks';
	import type { ProfileScreenProps } from '../types';

	let { data }: ProfileScreenProps = $props();

	const screen = useProfileScreen(() => data);
	// Wave 4.5 · screen 58: the calls «Προσωπικά στοιχεία» makes, each from the module that owns it.
	const personalPorts = usePersonalPorts();
	const options = $derived({ locale: screen.locale });

	// The page's server knows nobody (U-80.1 Ε6): it draws the wait, and the browser fills it in.
	const session = getSessionOptional();
	const viewer = $derived(appointmentsViewerOf(session));
	const isMember = $derived(viewer === 'member');
	const offline = $derived(online.current === false);

	// 🔴 D-W4-21 · D-W4-29: «Διαγραφή συγγενή;» reads the person's upcoming visits once while it is open, and the screen
	// names the doctor of the first — one public profile, never an id on screen (a module never imports another).
	const upcoming = useRelativeUpcoming({ enabled: () => isMember });
	const doctors = useDoctorPublicProfiles({
		ids: () => (upcoming.doctorId ? [upcoming.doctorId] : []),
		lang: () => screen.locale,
		enabled: () => isMember
	});

	// Wave 4.5 · screen 62 «Απόρρητο»: what its tools' row says is open, from the consent's own catalogue and decision
	// (D-W45-28) — the shell module's to say, this screen's to hand over (a module never imports another).
	const settingsPage = $derived(
		screen.address.view === 'settings' ? (screen.address.page ?? null) : null
	);
	const consentSummary = useConsentSummary(
		() => screen.locale,
		() =>
			screen.address.view === 'settings' &&
			screen.address.section === 'privacy' &&
			settingsPage === null
	);

	// 🔴 D-W45-30 (U-173 Ε1 Α): «Διαγραφή λογαριασμού» on the web. ONE state for its two addresses and its end, kept by
	// the screen so the end outlives the session it closes; 🔴 U-65.6: the code's hand-off lives in it alone.
	const onDeletion = $derived(settingsPage === 'deletion' || settingsPage === 'deletion-code');
	const profileViewer = $derived(profileViewerOf(session));
	const deletion = useAccountDeletion({
		active: () => onDeletion,
		locale: () => screen.locale,
		onCodeSent: () => void screen.openDeletionCode()
	});
	const deleted = $derived(deletion.done && settingsPage === 'deletion-code');
	// Without a session the two addresses go to the «Προφίλ»; the code step with no code out (a reload, a link, a
	// code past its ten minutes) goes back to step 1. Never once the deletion is done: its end stays where it is.
	$effect(() => {
		// Read first, so each of the two addresses is judged as it is opened (a guest's «forward» too).
		const where = settingsPage;
		if (!onDeletion || deletion.done) return;
		if (profileViewer === 'guest') void untrack(() => screen.leaveToProfile());
		else if (profileViewer === 'member' && where === 'deletion-code' && !deletion.hasCode) {
			void untrack(() => screen.backToDeletion());
		}
	});
	// The end was left for another address: nothing of the flow stays in the page.
	$effect(() => {
		if (deletion.done && settingsPage !== 'deletion-code') untrack(() => deletion.reset());
	});
</script>

<svelte:head>
	{#if screen.address.view === 'settings' && screen.address.section === 'privacy'}
		<!-- Wave 4.5 · screen 62: «Απόρρητο» and the pages it opens are also a guest's, outside the shell (D-W45-29). -->
		<title>{m.profile_menu_privacy({}, options)} | {m.brand_name({}, options)}</title>
		<meta name="robots" content="noindex" />
	{:else if screen.address.view === 'settings'}
		<!-- Wave 4.5 · screen 57: one title for the shell and every section of it. -->
		<title>{m.profile_menu_account_settings({}, options)} | {m.brand_name({}, options)}</title>
		<meta name="robots" content="noindex" />
	{:else if screen.address.view !== 'tab'}
		<!-- 🔴 U-65.6: the tab's title never names a relative — it stays in the history. -->
		<title>{m.relatives_title({}, options)} | {m.brand_name({}, options)}</title>
		<meta name="robots" content="noindex" />
	{/if}
</svelte:head>

<!-- 🔴 Wave 4.5 · screen 63 (record §5.1, D-W45-17, D-W45-59): the bell of a member's «Προφίλ» — the notifications
     module's, at the end of the title; below 744 only (from 744 the way to the list is the menu at the top right), and
     never a guest's (the tab draws its title's action for a member alone). -->
{#snippet bell()}
	<NotificationBell locale={screen.locale} href={screen.notificationsHref} />
{/snippet}

<!-- Wave 4.5 · screen 58 «Προσωπικά στοιχεία»: the profile module's page with the calls of the modules that own them
     (the patient's writes, the two challenges), drawn in the shell's section. -->
{#snippet personal()}
	<Personal locale={screen.locale} ports={personalPorts} {offline} />
{/snippet}

<!-- Wave 4.5 · screen 59 «Σύνδεση και ασφάλεια»: the auth module's page — every call it makes is the auth module's own
     (the password, the providers, the devices) — drawn in the shell's section. -->
{#snippet security()}
	<Security locale={screen.locale} {offline} />
{/snippet}

<!-- Wave 4.5 · screen 60 «Ειδοποιήσεις»: the notifications module's page, drawn in the shell's section (a module never
     imports another, so the screen composes them). -->
{#snippet notifications()}
	<NotificationSettings locale={screen.locale} {offline} />
{/snippet}

<!-- Wave 4.5 · screen 62 «Απόρρητο» (record §5.7): the profile module's page with the consent's line, and the three
     pages it opens — the shell module's «Εργαλεία τρίτων και cookies», the account module's «Διαγραφή λογαριασμού» and
     its code — each drawn in the shell's section with a «←» of its own. -->
{#snippet privacy()}
	<Privacy
		locale={screen.locale}
		member={isMember}
		links={screen.privacyLinks}
		toolsLine={consentSummary.line}
	/>
{/snippet}

{#snippet tools()}
	<ConsentTools locale={screen.locale} onSaved={() => void screen.openPrivacy()} />
{/snippet}

{#snippet deletionReview()}
	<DeletionFlow
		locale={screen.locale}
		step="review"
		flow={deletion}
		policyHref={screen.privacyLinks.policy}
	/>
{/snippet}

{#snippet deletionCode()}
	<DeletionFlow
		locale={screen.locale}
		step="code"
		flow={deletion}
		policyHref={screen.privacyLinks.policy}
	/>
{/snippet}

{#if screen.address.view === 'settings'}
	<!-- Wave 4.5 · screen 57 (record §5.2, D-W45-01): «Ρυθμίσεις λογαριασμού» and its sections under the same route, so
	     the menu keeps its place while the right column changes — no capsule, no footer (D-W45-07). -->
	<main
		data-testid="settings-page"
		data-section={screen.address.section}
		data-page={screen.address.page}
		class="min-h-dvh bg-card tablet:min-h-page split:min-h-0"
	>
		{#if deleted}
			<!-- 🔴 D-W45-30: the end of «Διαγραφή λογαριασμού» — the browser's session has closed under it, so it is drawn
			     in the shell's place (a guest has no «Διαγραφή λογαριασμού»), until this address is left. -->
			<DeletionDone
				locale={screen.locale}
				destination={deletion.destination}
				homeHref={screen.homeHref}
			/>
		{:else if !(onDeletion && profileViewer === 'guest')}
			<!-- (A deletion address without a session draws nothing: it is on its way to the «Προφίλ».) -->
			<Settings
				locale={screen.locale}
				section={screen.address.section ?? null}
				page={settingsPage}
				links={screen.settingsLinks}
				languageHref={screen.languageHref}
				sectionContent={{ personal, security, notifications, privacy }}
				pageContent={{
					tools: { title: m.consent_tools_title({}, options), content: tools },
					deletion: {
						title: m.profile_account_deletion_title({}, options),
						content: deletionReview
					},
					'deletion-code': {
						title: m.profile_account_deletion_code_title({}, options),
						content: deletionCode
					}
				}}
			/>
		{/if}
	</main>
{:else if screen.address.view === 'tab' || !screen.relativesAddress}
	<!-- The phone's «Προφίλ» (U-81.1): the application's tab, a page of the site. -->
	<ProfileTab
		locale={screen.locale}
		hrefOf={screen.hrefOf}
		onRow={screen.onRow}
		doctorHref={screen.doctorHref}
		headerAction={bell}
	/>
{:else}
	<!-- Wave 4.0 · screen 55 (record §11, U-139): «Οι συγγενείς μου» and the relative's form under one route, so the list
	     keeps its place and its scroll while the right column changes — the capsule on the list alone (P-W4 Σ-25), no
	     footer (D-W4-55). -->
	<main
		data-testid="relatives-page"
		data-view={screen.address.view}
		class="min-h-dvh bg-card tablet:min-h-page split:min-h-0"
	>
		<Relatives
			locale={screen.locale}
			address={screen.relativesAddress}
			links={screen.relativesLinks}
			{viewer}
			{offline}
			toMobilePhone={screen.toMobilePhone}
			splitMobilePhone={screen.splitMobilePhone}
			{upcoming}
			doctorNameOf={(doctorId) => {
				const doctor = doctors.of(doctorId);
				return doctor === undefined ? undefined : (doctor?.name ?? null);
			}}
			onSignIn={() => session?.requireSignIn()}
			onRetrySession={() => session?.retryRead()}
		/>
	</main>
{/if}
