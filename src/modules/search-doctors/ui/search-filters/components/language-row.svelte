<script lang="ts">
	import { cn } from '$shared/lib/utils';

	let {
		label,
		count,
		selected,
		onPress,
		testId
	}: {
		/** The backend's words for the language. */
		label: string;
		/** The count as written («20», «1.234+»). */
		count: string;
		selected: boolean;
		onPress: () => void;
		testId?: string;
	} = $props();
</script>

<!-- The application's `LanguageRow` (U-24.3, the prototype's `.frow`): a bordered row, the language on the left and
     its count muted on the right; chosen ⇒ 2 dark (the inset ring inside the 1 border, so nothing reflows). One
     language at most: a press on the chosen one clears it. -->
<button
	type="button"
	aria-pressed={selected}
	data-slot="filters-language-row"
	data-testid={testId}
	class={cn(
		'flex min-h-row w-full flex-row items-center justify-between gap-3 rounded-md border px-4 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
		selected ? 'border-foreground ring-1 ring-foreground ring-inset' : 'border-border',
		'transition-colors duration-standard ease-standard can-hover:hover:border-foreground'
	)}
	onclick={() => onPress()}
>
	<span class="text-body-md text-foreground">{label}</span>
	<span class="text-label-md text-muted-foreground">{count}</span>
</button>
