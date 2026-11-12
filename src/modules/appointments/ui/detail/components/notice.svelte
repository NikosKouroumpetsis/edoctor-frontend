<script lang="ts" module>
	/** Warm: something to act on · neutral: how it ended · done: what was just saved (record §7.2, U-136.6). */
	export type NoticeTone = 'warm' | 'neutral' | 'done';

	// The prototype's `.a-note` (warn), `.plain` (band) and `.ok` (the status pill's green): the theme's tints, no hex.
	const toneClasses: Record<NoticeTone, string> = {
		warm: 'border-warning/40 bg-warning/10',
		neutral: 'border-line bg-background',
		done: 'border-success/40 bg-success/10'
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Button } from '$shared/ui/primitives/button';

	let {
		tone,
		text,
		lines,
		call = null,
		testId
	}: {
		tone: NoticeTone;
		text: string;
		/** Who and when, the reason, the words: each on its own line (U-135.5). */
		lines: string[];
		/** «Κλήση ιατρείου · 210 …» when the deadline passed (U-76.1). */
		call?: { label: string; dial: string } | null;
		testId?: string;
	} = $props();
</script>

{#snippet phoneGlyph()}
	<Ionicon name="call-outline" class="icon-md" />
{/snippet}

<!-- One notice (`appt.css:132-136`): its sentence (500), then its lines (13 muted), then the call. Every word a text node. -->
<div
	data-slot="appointment-notice"
	data-tone={tone}
	data-testid={testId}
	role={tone === 'done' ? 'status' : undefined}
	class={cn('mb-3 rounded-md border px-3.5 py-3 text-body-sm text-foreground', toneClasses[tone])}
>
	<p class="font-medium">{text}</p>
	{#each lines as line, index (index)}
		<p class="mt-1 text-label-lg font-normal text-muted-foreground">{line}</p>
	{/each}
	{#if call}
		<Button
			tone="outline"
			hover={false}
			href={`tel:${call.dial}`}
			label={call.label}
			leading={phoneGlyph}
			textClass="text-body-sm"
			class="mt-3"
			data-testid="appointment-notice-call"
		/>
	{/if}
</div>
