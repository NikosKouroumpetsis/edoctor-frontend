<script lang="ts" module>
	/** `done`: what was just saved (green, `appt.css:315` `.a-note.ok`) · `warm`: a relative the server keeps no more. */
	export type RelativesNoticeTone = 'done' | 'warm';

	// The prototype's `.a-note.ok` and `.a-note` (the status pill's green, the warning's tint): the theme's, no hex.
	const toneClasses: Record<RelativesNoticeTone, string> = {
		done: 'border-success/40 bg-success/10',
		warm: 'border-warning/40 bg-warning/10'
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';

	let { tone, text }: { tone: RelativesNoticeTone; text: string } = $props();
</script>

<!-- Record §11.2 «Μετά» (D-W4-33): the list's word right after a write, above the rows; a name in it is a text node. -->
<div
	data-testid="relatives-done"
	data-tone={tone}
	role="status"
	class={cn(
		'mb-3 rounded-md border px-3.5 py-3 text-body-sm font-medium text-foreground',
		toneClasses[tone]
	)}
>
	<p>{text}</p>
</div>
