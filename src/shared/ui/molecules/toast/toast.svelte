<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { MediaPlaceholder } from '$shared/ui/primitives/media-placeholder';
	import { TextButton } from '$shared/ui/primitives/text-button';
	import type { ToastOptions } from './toast-state.svelte';

	let {
		message,
		tone = 'info',
		leading,
		action,
		onAction,
		class: className
	}: Pick<ToastOptions, 'message' | 'tone' | 'leading' | 'action'> & {
		/** Pressing the action: the host closes the card as well. */
		onAction?: () => void;
		class?: string;
	} = $props();

	const glyph = $derived(
		leading?.kind === 'glyph' ? leading.name : tone === 'danger' ? 'alert-circle' : null
	);
	// The photo the browser could not load: the kit's silhouette instead, as on the cards (S-32.8).
	let brokenPhoto = $state<string | null>(null);
</script>

<!-- The card of Airbnb's app: 64 at least, the 16 corner, the floating shadow; a 40 photo or glyph, the words 15/500,
     the action underlined in its 48 target. Words are text nodes only: nothing a person typed can become markup. -->
<div
	data-slot="toast"
	data-tone={tone}
	class={cn(
		'flex min-h-control-xl w-full flex-row items-center gap-3 rounded-lg bg-card py-2 pr-2 pl-3 text-foreground shadow-floating dark:ring-1 dark:ring-border',
		className
	)}
>
	{#if leading?.kind === 'photo'}
		{@const photo = leading.src}
		{#if brokenPhoto === photo}
			<MediaPlaceholder
				data-slot="toast-photo-placeholder"
				class="size-control-sm shrink-0 rounded-sm"
			/>
		{:else}
			<img
				data-slot="toast-photo"
				src={photo}
				alt={leading.alt ?? ''}
				class="size-control-sm shrink-0 rounded-sm bg-muted object-cover"
				onerror={() => (brokenPhoto = photo)}
			/>
		{/if}
	{:else if glyph}
		<span
			data-slot="toast-glyph"
			class={cn(
				'grid size-control-sm shrink-0 place-items-center',
				tone === 'danger' ? 'text-danger-text' : 'text-foreground'
			)}
		>
			<Ionicon name={glyph} class="icon-lg" />
		</span>
	{/if}
	<p data-slot="toast-message" class="min-w-0 flex-1 py-1 text-body-md font-medium">{message}</p>
	{#if action}
		<TextButton
			label={action.label}
			tone="foreground"
			underline
			textClass="text-body-md"
			data-slot="toast-action"
			class="shrink-0 rounded-md px-3 transition-colors duration-standard ease-standard can-hover:hover:bg-foreground/5"
			onclick={() => {
				action.onPress();
				onAction?.();
			}}
		/>
	{/if}
</div>
