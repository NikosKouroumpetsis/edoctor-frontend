<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { step } from '$shared/design/tokens';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuSeparator,
		DropdownMenuTrigger
	} from '$shared/ui/primitives/dropdown-menu';
	import type { DoctorMenuRow, DoctorMenuRowId } from '$modules/doctor-dashboard/lib/menu';

	let {
		groups,
		locale,
		initial = null,
		hasUnread = false,
		hasNewNotifications = false,
		hrefOf,
		patientModeHref,
		onPatientMode,
		onSignOut
	}: {
		/** The doctor menu's rows in their groups (`buildDoctorMenuGroups`). */
		groups: DoctorMenuRow[][];
		locale: SupportedLocale;
		/** The member's initial in the pill, as the site's menu (none: the person's glyph). */
		initial?: string | null;
		/** The pill's dot: something unread, or a new notification (the site's menu's same dot, U-84 Π5 · D-W45-17). */
		hasUnread?: boolean;
		hasNewNotifications?: boolean;
		/** Each row's page, resolved in the page's language. */
		hrefOf: (row: DoctorMenuRowId) => string;
		/** «Λειτουργία ασθενή»: the patient's home before the scripts have run; `onPatientMode` switches in place. */
		patientModeHref: string;
		onPatientMode: () => void;
		onSignOut: () => void;
	} = $props();

	let open = $state(false);
	const options = $derived({ locale });
	const hasDot = $derived(hasUnread || hasNewNotifications);
	const menuLabel = $derived.by(() => {
		if (hasUnread && hasNewNotifications) {
			return m.account_menu_with_new_messages_and_notifications({}, options);
		}
		if (hasUnread) return m.account_menu_with_new_messages({}, options);
		if (hasNewNotifications) return m.account_menu_with_new_notifications({}, options);
		return m.account_menu({}, options);
	});
	const itemClass =
		'min-h-touch rounded-none px-4.5 py-2.5 text-body-sm hover:bg-background focus:bg-background';

	function patientMode(event: MouseEvent) {
		event.preventDefault();
		onPatientMode();
	}
</script>

<!-- 🔴 Screens 65 / 76 (D-W51-04, D-W51-16; `64-switch/sw.js:893-901`, `76-menu` `?stage=51`): the doctor's ☰ — the site's
     menu pill (☰ and the initial as ONE button, the dot while something is new) and, under it, the doctor menu's rows of
     5.1: «Ειδοποιήσεις» (its dot) · «Ρυθμίσεις λογαριασμού» · «Κέντρο βοήθειας» · «Όροι γιατρών» · «Λειτουργία ασθενή»
     (744–1127 only: from 1128 the bar has it) · «Αποσύνδεση». Never «Οι συγγενείς μου» (U-186.1). -->
<DropdownMenu bind:open>
	<DropdownMenuTrigger
		aria-label={menuLabel}
		data-testid="doctor-account-menu"
		class="group min-h-touch rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
	>
		<span
			class="relative flex flex-row items-center gap-2.5 rounded-full border border-border bg-muted-foreground/8 py-1 pr-1 pl-3 text-foreground transition-[background-color,box-shadow] duration-standard ease-standard group-hover:bg-card group-hover:shadow-raised group-data-[state=open]:bg-card group-data-[state=open]:shadow-raised"
		>
			<Ionicon name="menu" class="icon-sm" />
			{#if initial}
				<span
					class="grid size-avatar-sm place-items-center overflow-hidden rounded-full bg-primary text-body-sm font-semibold text-primary-foreground"
				>
					{initial}
				</span>
			{:else}
				<span
					class="grid size-avatar-sm place-items-center overflow-hidden rounded-full bg-muted-foreground text-card"
				>
					<Ionicon name="person" class="icon-md" />
				</span>
			{/if}
			{#if hasDot}
				<span
					aria-hidden="true"
					data-testid="doctor-account-dot"
					class="absolute top-0.5 right-0.5 size-2.5 rounded-full bg-accent ring-2 ring-card"
				></span>
			{/if}
		</span>
	</DropdownMenuTrigger>
	<DropdownMenuContent
		align="end"
		sideOffset={step(1)}
		data-testid="doctor-account-menu-content"
		class="w-account-menu-w rounded-lg border-0 px-0 py-2 shadow-floating"
	>
		{#each groups as group, index (group[0]?.id ?? index)}
			{#if group[0]?.id === 'sign-out'}
				<!-- «Λειτουργία ασθενή» before «Αποσύνδεση», with its own rule: only where the bar has no room (744–1127). -->
				<DropdownMenuSeparator class="my-2 laptop:hidden" />
				<DropdownMenuItem
					href={patientModeHref}
					onclick={patientMode}
					data-testid="doctor-account-entry-patient-mode"
					class={[
						itemClass,
						'flex-row items-center justify-start gap-2.5 font-semibold laptop:hidden'
					]}
				>
					<Ionicon name="swap-horizontal-outline" class="icon-md shrink-0" />
					{m.doctor_mode_patient({}, options)}
				</DropdownMenuItem>
			{/if}
			{#if index > 0}
				<DropdownMenuSeparator class="my-2" />
			{/if}
			{#each group as row (row.id)}
				{#if row.id === 'sign-out'}
					<DropdownMenuItem
						onclick={onSignOut}
						data-testid="doctor-account-entry-sign-out"
						class={itemClass}>{row.label}</DropdownMenuItem
					>
				{:else if row.id === 'notifications' && hasNewNotifications}
					<!-- D-W45-17: ONE name for the row, «Ειδοποιήσεις, νέες», its dot silent. -->
					<DropdownMenuItem
						href={hrefOf(row.id)}
						aria-label={m.notifications_inbox_bell_unread({}, options)}
						data-testid="doctor-account-entry-notifications"
						class={[itemClass, 'flex-row items-center justify-between gap-2']}
					>
						{row.label}
						<span
							aria-hidden="true"
							data-testid="doctor-account-entry-notifications-dot"
							class="size-2 shrink-0 rounded-full bg-accent"
						></span>
					</DropdownMenuItem>
				{:else}
					<DropdownMenuItem
						href={hrefOf(row.id)}
						data-testid={`doctor-account-entry-${row.id}`}
						class={itemClass}>{row.label}</DropdownMenuItem
					>
				{/if}
			{/each}
		{/each}
	</DropdownMenuContent>
</DropdownMenu>
