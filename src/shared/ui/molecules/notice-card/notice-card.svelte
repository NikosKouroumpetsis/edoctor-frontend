<script lang="ts" module>
	/** Warm: something to act on · neutral: how a thing stands · done: what was just saved (the approved `.a-note`). */
	export type NoticeCardTone = 'warm' | 'neutral' | 'done';

	// The prototype's `.a-note` (warn), `.plain` (band) and `.ok` (the status pill's green): the theme's tints, no hex.
	const toneClasses: Record<NoticeCardTone, string> = {
		warm: 'border-warning/40 bg-warning/10',
		neutral: 'border-line bg-background',
		done: 'border-success/40 bg-success/10'
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$shared/lib/utils';
	import { Ionicon, type IoniconName } from '$shared/ui/icons/ionicon';

	let {
		tone = 'warm',
		icon,
		title,
		lines = [],
		detail,
		role,
		action,
		testId,
		class: className
	}: {
		tone?: NoticeCardTone;
		/** A 24 glyph before the words, at the height of the sentence (a status: «✓», «!»); none by default. */
		icon?: IoniconName;
		/** The notice's one sentence (500). */
		title: string;
		/** What it means, each on its own line (13, muted). */
		lines?: string[];
		/** A last line of the caller's own, drawn as the lines (its words with a link inside, a number to call). */
		detail?: Snippet;
		/** `status` for a notice that comes after an action; none for one that is part of the page. */
		role?: 'status' | 'alert';
		/** At most one way on, below the lines (a button or a link of the caller's). */
		action?: Snippet;
		testId?: string;
		class?: string;
	} = $props();
</script>

{#snippet words()}
	<p class="font-medium">{title}</p>
	{#each lines as line, index (index)}
		<p class="mt-1 text-label-lg font-normal text-muted-foreground">{line}</p>
	{/each}
	{#if detail}
		<p class="mt-1 text-label-lg font-normal text-muted-foreground">{@render detail()}</p>
	{/if}
	{#if action}
		<div class="mt-3">{@render action()}</div>
	{/if}
{/snippet}

<!-- A notice in a page (the approved `appt.css:132-136` `.a-note`, wave 4; screen 64's licence notice, wave 5): its
     sentence, then its lines, then at most one way on. With an `icon` (screen 77's status, `sw.css` `.w-pst`) the glyph
     stands before the words, 12 away. Every word a text node, never HTML. -->
<div
	data-slot="notice-card"
	data-tone={tone}
	data-testid={testId}
	{role}
	class={cn(
		'rounded-md border px-3.5 py-3 text-body-sm text-foreground',
		icon && 'flex flex-row items-start gap-3',
		toneClasses[tone],
		className
	)}
>
	{#if icon}
		<Ionicon name={icon} class="icon-lg shrink-0" />
		<div data-slot="notice-card-words" class="min-w-0 flex-1">{@render words()}</div>
	{:else}
		{@render words()}
	{/if}
</div>
