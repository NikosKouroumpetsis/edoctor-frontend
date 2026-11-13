<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { getSessionOptional } from '$shared/state/session';
	import { EmptyState } from '$shared/ui/molecules/empty-state';
	import { StateGlyph } from '$shared/ui/molecules/state-glyph';
	import { getToastsOptional } from '$shared/ui/molecules/toast';
	import type {
		NotificationPreferenceCategory,
		NotificationPreferenceFailure
	} from '$modules/notifications/api/preferences';
	import ChangeDialog from '../components/change-dialog.svelte';
	import Row from '../components/row.svelte';
	import Skeleton from '../components/skeleton.svelte';
	import { useNotificationPreferences } from '../hooks/use-preferences.svelte';
	import type { NotificationSettingsPageProps } from '../types';

	let { locale, offline }: NotificationSettingsPageProps = $props();

	const options = $derived({ locale });
	const session = getSessionOptional();
	const toasts = getToastsOptional();

	// 🔴 D-W45-24: a switch the server did not keep goes back, and the page says so in passing. U-84: a write the server
	// refused with `401` is a session that ended — the page learns it now and the sign-in opens over it.
	function failed(failure: NotificationPreferenceFailure) {
		toasts?.show({ tone: 'danger', message: m.notifications_settings_save_failed({}, options) });
		if (failure === 'session') session?.expire({});
	}

	const preferences = useNotificationPreferences({
		enabled: () => session?.isMember === true,
		locale: () => locale,
		offline: () => offline,
		onFailed: failed
	});

	// The window keeps its kind while it closes (its way out is drawn), so which kind and whether it is open are two.
	let chosen = $state<string | null>(null);
	let open = $state(false);
	const row = $derived(
		preferences.groups.flatMap((group) => group.rows).find((entry) => entry.category === chosen) ??
			null
	);
	// A kind that left the answer under its open window (another account's, a broken read) takes the window with it.
	$effect(() => {
		if (open && row === null) open = false;
	});

	function change(category: NotificationPreferenceCategory) {
		chosen = category;
		open = true;
	}
</script>

{#snippet errorGlyph()}
	<StateGlyph name="cloud-offline-outline" />
{/snippet}

<!-- Wave 4.5 · screen 60 «Ειδοποιήσεις», the settings (record §5.5; the approved prototype `60-notifications/not.js`), a
     section of the shell (its title and its «←» are the shell's). 🔴 D-W45-22: the PATIENT's kinds alone, in three
     groups — «Ραντεβού», «Μηνύματα και ερωτήσεις», «Λογαριασμός» — each kind a row: title, what is on, «Αλλαγή» where it
     has a switch. «Αλλαγή» opens the kind's window; every press of a switch is saved at once (D-W45-24) and the row
     behind says the new state. Its states in the 55's words: the wait, a read with no answer and «Δοκιμάστε ξανά».
     No card «Ενεργοποίηση ειδοποιήσεων» here: that is the application's alone (D-W45-25). -->
<div data-testid="notification-settings" data-view={preferences.view}>
	{#if preferences.view === 'loading'}
		<Skeleton label={m.profile_account_settings_sections_notifications({}, options)} />
	{:else if preferences.view === 'failed'}
		<EmptyState
			titleAs="h3"
			title={m.notifications_settings_error_title({}, options)}
			description={m.notifications_settings_error_body({}, options)}
			actionLabel={m.notifications_settings_retry({}, options)}
			onActionPress={() => preferences.retry()}
			actionTone="contrast"
			icon={errorGlyph}
			class="pt-section"
			testId="notification-settings-error"
		/>
	{:else}
		{#each preferences.groups as group (group.id)}
			{@const titleId = `notification-group-title-${group.id}`}
			<section
				aria-labelledby={titleId}
				data-testid={`notification-group-${group.id}`}
				class="mt-reading-gap-sm first:mt-5"
			>
				<h3 id={titleId} class="mb-1 text-title-lg font-semibold text-foreground">
					{group.title}
				</h3>
				<ul>
					{#each group.rows as entry (entry.category)}
						<Row
							row={entry}
							changeLabel={m.profile_account_settings_change({}, options)}
							onChange={() => change(entry.category)}
						/>
					{/each}
				</ul>
			</section>
		{/each}
	{/if}
</div>
<ChangeDialog
	bind:open
	{row}
	closeLabel={m.common_close({}, options)}
	onToggle={(next) => preferences.toggle(next)}
/>
