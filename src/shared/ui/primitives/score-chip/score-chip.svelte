<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';
	import type { IoniconName } from '$shared/ui/icons/ionicon';

	export type ScoreChipProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
		icon: IoniconName;
		label: string;
		/** The score as the screen shows it (already formatted by the caller, «4,9»). */
		value: string;
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';

	let { icon, label, value, class: className, ...restProps }: ScoreChipProps = $props();
</script>

<!-- A review category and its score (M-17): a framed glyph and «label value», never pressable. -->
<span
	data-slot="score-chip"
	class={cn(
		'inline-flex shrink-0 flex-row items-center gap-2 rounded-md border border-border/70 px-3 py-2',
		className
	)}
	{...restProps}
>
	<Ionicon name={icon} class="icon-sm text-foreground" />
	<span class="text-body-sm font-semibold text-muted-foreground">{label} {value}</span>
</span>
