<script lang="ts" module>
	/**
	 * Waiting warm, kept green, every other state neutral (the approved `.a-st`, `appt.css:98-102`); 🔴 D-W52-102: refused
	 * in the accent's outline (`sw.css:624` `.a-st.no`, «Δεν δημοσιεύτηκε» of screen 85).
	 */
	export type StatusPillTone = 'warning' | 'success' | 'muted' | 'refused';

	/** One state as a pill: the caller's words, already localized, and the tone they are read in. */
	export type StatusPillValue = { label: string; tone: StatusPillTone };

	// Record §6.1 (screen 31's `.b-state`, `appt.css:99-102`): the theme's warning, success and chip — never a hex.
	const toneClasses: Record<StatusPillTone, string> = {
		warning: 'border-warning/40 bg-warning/10 text-foreground',
		success: 'border-success/40 bg-success/10 text-success-text',
		muted: 'border-line-2 bg-chip text-foreground',
		refused: 'border-accent bg-transparent text-accent'
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';

	let {
		pill,
		class: className,
		testId
	}: {
		pill: StatusPillValue;
		class?: string;
		testId?: string;
	} = $props();
</script>

<!-- A state's pill, one look on every page that shows one (P-W4 Σ-27; shared since wave 5.1, D-W51-27): 24 high, the 999
     corner, 12/500, the tone's tint and line. Every word a text node. -->
<span
	data-slot="status-pill"
	data-tone={pill.tone}
	data-testid={testId}
	class={cn(
		'inline-flex min-h-6 items-center self-start rounded-full border px-2.5 text-label-md font-medium whitespace-nowrap',
		toneClasses[pill.tone],
		className
	)}
>
	{pill.label}
</span>
