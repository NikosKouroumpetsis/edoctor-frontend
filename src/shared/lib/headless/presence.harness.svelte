<script lang="ts">
	import { Presence } from './presence.svelte';

	let { open = false }: { open?: boolean } = $props();
	const presence = new Presence(() => open, { duration: 'standard' });
</script>

{#if presence.present}
	<div
		use:presence.track
		data-testid="layer"
		data-state={presence.state}
		inert={presence.closing}
		class="transition-opacity duration-standard ease-standard data-[state=closed]:pointer-events-none data-[state=closed]:opacity-0 starting:opacity-0"
	>
		<span data-testid="child" class="transition-opacity duration-standard ease-standard"></span>
	</div>
{/if}
