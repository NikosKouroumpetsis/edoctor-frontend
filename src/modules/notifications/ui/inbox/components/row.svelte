<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import type { NotificationRow } from '$modules/notifications/types';

	let {
		row,
		href,
		newLabel,
		onPress
	}: {
		row: NotificationRow;
		/** The screen of what the line is about (D-W45-45); `null` when it opens nothing (a question, an unknown kind). */
		href: string | null;
		/** «Νέα»: what the dot of a new line says aloud. */
		newLabel: string;
		/** 🔴 U-174 (Ε2 Β): the press — «read» leaves with it, and never holds the link back. */
		onPress: () => void;
	} = $props();

	const testId = $derived(`notifications-row-${row.id}`);
	const box =
		'flex min-h-touch w-full flex-row items-start gap-3.5 border-b border-line py-4 text-left';
	const pressable =
		'transition-opacity duration-standard ease-standard outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-70';
</script>

<!-- One notification (record §5.8, `63-inbox/list.css:8-14` `.i-row`): the glyph of its kind in the 44 circle, the title
     (15 / 500; 600 while new) and the server's second line (14) on at most TWO lines each (the approved shot
     `m-list.png`, the application's way) — no second line when the server sent none — and when it came (13). A new one
     carries the 10 dot at the right, said aloud as «Νέα». 🔴 U-65.6: every word is a text node, whatever the server
     sent. No colour under the pointer (U-100). -->
{#snippet line()}
	<span
		aria-hidden="true"
		class="grid size-inbox-glyph shrink-0 place-items-center rounded-full bg-chip text-foreground"
	>
		<Ionicon name={row.glyph} class="icon-lg" />
	</span>
	<span class="grid min-w-0 flex-1 gap-0.5">
		<span
			data-slot="notification-title"
			data-testid={`${testId}-title`}
			class={cn(
				'line-clamp-2 text-body-md wrap-anywhere text-foreground',
				row.fresh ? 'font-semibold' : 'font-medium'
			)}
		>
			{row.title}
		</span>
		{#if row.body}
			<span
				data-slot="notification-body"
				data-testid={`${testId}-body`}
				class="line-clamp-2 text-body-sm wrap-anywhere text-muted-foreground"
			>
				{row.body}
			</span>
		{/if}
		{#if row.when}
			<time
				data-slot="notification-when"
				data-testid={`${testId}-when`}
				datetime={row.at}
				class="text-label-lg text-muted-foreground"
			>
				{row.when}
			</time>
		{/if}
	</span>
	{#if row.fresh}
		<span
			role="img"
			aria-label={newLabel}
			data-testid={`${testId}-dot`}
			class="mt-1.5 size-2.5 shrink-0 rounded-full bg-accent"
		></span>
	{/if}
{/snippet}

<li>
	{#if href}
		<!-- A real link to what the line is about: «read» leaves at the press and the browser goes on by itself. The
		     screen's address, already resolved (a module knows no route). -->
		<!-- eslint-disable svelte/no-navigation-without-resolve -->
		<a
			{href}
			data-testid={testId}
			data-new={row.fresh || undefined}
			onclick={onPress}
			class={cn(box, pressable)}
		>
			{@render line()}
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	{:else if row.fresh}
		<!-- 🔴 D-W45-59: nothing to open (a question has no screen yet): the press only reads the line. -->
		<button
			type="button"
			data-testid={testId}
			data-new="true"
			onclick={onPress}
			class={cn(box, pressable)}
		>
			{@render line()}
		</button>
	{:else}
		<!-- Read, and nothing to open: a line of text, no control. -->
		<div data-testid={testId} class={box}>
			{@render line()}
		</div>
	{/if}
</li>
