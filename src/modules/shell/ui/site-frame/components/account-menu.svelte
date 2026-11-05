<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuSeparator,
		DropdownMenuTrigger
	} from '$shared/ui/primitives/dropdown-menu';
	import { step } from '$shared/design/tokens';
	import type { AccountEntry, FrameMessageOptions } from '../types';

	let {
		entries,
		messageOptions,
		initial = null,
		hasUnread = false,
		onSettings,
		onSignIn,
		onSignOut
	}: {
		/** The menu of a guest or a member (`buildAccountEntries`). */
		entries: AccountEntry[];
		messageOptions: FrameMessageOptions;
		/** A member's initial in the pill (as «Καλωσορίσατε»); a guest, or a member without a name, the glyph. */
		initial?: string | null;
		/** 🔴 U-84 Π5: a conversation is unread: the 10 dot on the pill. */
		hasUnread?: boolean;
		/** «Ρυθμίσεις»: the language and the theme live only there (U-16.1, U-17.4). */
		onSettings: () => void;
		/** «Σύνδεση ή εγγραφή» opens the window in place (Π2), its link the page before the scripts have run. */
		onSignIn?: () => void;
		onSignOut: () => void;
	} = $props();

	let open = $state(false);
	const itemClass =
		'min-h-touch rounded-none px-4.5 py-2.5 text-body-sm hover:bg-background focus:bg-background';

	function signIn(event: MouseEvent) {
		if (!onSignIn) return;
		event.preventDefault();
		onSignIn();
	}
</script>

<!-- Airbnb's menu pill (U-17.2, U-17.5): ☰ and the profile glyph side by side as ONE button (42 high on the grey with
     its rim; white with a shadow on hover and while open), inside the 48 target. Its menu, under it at the right
     (260, the 16 corner), fades and grows in (the kit's menu, 0.25 s). A member's pill: the initial on the primary. -->
<DropdownMenu bind:open>
	<DropdownMenuTrigger
		aria-label={hasUnread
			? m.account_menu_with_new_messages({}, messageOptions)
			: m.account_menu({}, messageOptions)}
		data-testid="header-account-menu"
		class="group min-h-touch rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
	>
		<span
			class="relative flex flex-row items-center gap-2.5 rounded-full border border-border bg-muted-foreground/8 py-1 pr-1 pl-3 text-foreground transition-[background-color,box-shadow] duration-standard ease-standard group-hover:bg-card group-hover:shadow-raised group-data-[state=open]:bg-card group-data-[state=open]:shadow-raised"
		>
			<Ionicon name="menu" class="icon-sm" />
			{#if initial}
				<span
					data-testid="header-account-initial"
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
			{#if hasUnread}
				<span
					aria-hidden="true"
					data-testid="header-account-dot"
					class="absolute top-0.5 right-0.5 size-2.5 rounded-full bg-accent ring-2 ring-card"
				></span>
			{/if}
		</span>
	</DropdownMenuTrigger>
	<DropdownMenuContent
		align="end"
		sideOffset={step(1)}
		data-testid="header-account-menu-content"
		class="w-account-menu-w rounded-lg border-0 px-0 py-2 shadow-floating"
	>
		{#each entries as entry (entry.key)}
			{#if entry.separated}
				<DropdownMenuSeparator class="my-2" />
			{/if}
			{#if entry.kind === 'settings'}
				<DropdownMenuItem onclick={onSettings} class={itemClass}>{entry.label}</DropdownMenuItem>
			{:else if entry.kind === 'sign-out'}
				<DropdownMenuItem onclick={onSignOut} class={itemClass}>{entry.label}</DropdownMenuItem>
			{:else if entry.key === 'sign-in'}
				<DropdownMenuItem
					href={entry.href}
					onclick={signIn}
					class={[itemClass, entry.emphasis && 'font-semibold']}>{entry.label}</DropdownMenuItem
				>
			{:else if entry.description}
				<DropdownMenuItem href={entry.href} class={[itemClass, 'flex-col items-start gap-0.5']}>
					<span class="font-semibold">{entry.label}</span>
					<span class="text-label-md font-normal text-muted-foreground">{entry.description}</span>
				</DropdownMenuItem>
			{:else if entry.kind === 'link' && entry.dotLabel}
				<DropdownMenuItem
					href={entry.href}
					class={[itemClass, 'flex-row items-center justify-between gap-2 font-semibold']}
				>
					{entry.label}
					<span
						role="img"
						aria-label={entry.dotLabel}
						data-testid="header-account-entry-dot"
						class="size-2 shrink-0 rounded-full bg-accent"
					></span>
				</DropdownMenuItem>
			{:else}
				<DropdownMenuItem href={entry.href} class={[itemClass, entry.emphasis && 'font-semibold']}
					>{entry.label}</DropdownMenuItem
				>
			{/if}
		{/each}
	</DropdownMenuContent>
</DropdownMenu>
