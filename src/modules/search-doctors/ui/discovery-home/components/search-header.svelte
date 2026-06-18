<script lang="ts">
	import SearchIcon from '~icons/lucide/search';
	import SlidersIcon from '~icons/lucide/sliders-horizontal';

	let { placeholder }: { placeholder: string } = $props();
</script>

<button
	type="button"
	class="flex w-full items-center gap-3 rounded-full border border-border/70 bg-card px-5 py-4 text-left shadow-soft transition-colors outline-none hover:border-border focus-visible:ring-3 focus-visible:ring-ring/50"
>
	<SearchIcon class="icon-lg text-foreground" />
	<span class="flex-1 truncate text-body-md text-foreground/75">{placeholder}</span>
	<span
		class="grid size-8 place-items-center rounded-full border border-border/70 text-muted-foreground"
	>
		<SlidersIcon class="icon-sm" />
	</span>
</button>
