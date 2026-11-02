<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { BottomSheet, BottomSheetTitle } from '$shared/ui/molecules/bottom-sheet';
	import type { AccountEntry, FrameMessageOptions } from '../types';

	let {
		open = $bindable(false),
		entries,
		messageOptions,
		onSettings
	}: {
		open?: boolean;
		/** The guest's account menu, the one list the ☰ menu draws from 744 (`buildAccountEntries`). */
		entries: AccountEntry[];
		messageOptions: FrameMessageOptions;
		/** «Ρυθμίσεις»: the sheet closes and the dialog opens (the language and the theme, U-16.1). */
		onSettings: () => void;
	} = $props();

	const rowClass =
		'flex min-h-touch w-full flex-col items-start justify-center gap-0.5 px-6 py-2.5 text-start text-body-md text-foreground outline-none hover:bg-background focus-visible:bg-background focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset';

	function settings() {
		open = false;
		onSettings();
	}
</script>

<!-- The capsule's «Προφίλ» for a guest (below 744, U-19.1): the kit's sheet from below with the SAME four entries as
     the ☰ menu from 744 — «Σύνδεση ή εγγραφή» · «Ρυθμίσεις» (the dialog) · «Κέντρο βοήθειας» · «Είστε γιατρός;». -->
<BottomSheet bind:open data-testid="account-sheet">
	<BottomSheetTitle class="sr-only">{m.account_menu({}, messageOptions)}</BottomSheetTitle>
	<ul data-slot="account-sheet-list" class="flex flex-col pt-1 pb-6">
		{#each entries as entry (entry.key)}
			<li class={entry.separated ? 'mt-2 border-t border-border pt-2' : undefined}>
				{#if entry.kind === 'settings'}
					<button
						type="button"
						data-testid={`account-sheet-${entry.key}`}
						onclick={settings}
						class={rowClass}>{entry.label}</button
					>
				{:else}
					<a
						href={entry.href}
						data-testid={`account-sheet-${entry.key}`}
						onclick={() => (open = false)}
						class={rowClass}
					>
						<span class={entry.emphasis || entry.description ? 'font-semibold' : undefined}
							>{entry.label}</span
						>
						{#if entry.description}
							<span class="text-body-sm text-muted-foreground">{entry.description}</span>
						{/if}
					</a>
				{/if}
			</li>
		{/each}
	</ul>
</BottomSheet>
