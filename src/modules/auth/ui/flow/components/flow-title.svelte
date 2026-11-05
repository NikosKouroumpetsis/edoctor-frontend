<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { AuthFlowState } from '../hooks/flow-state.svelte';
	import { flowTitleClass } from '../lib/classes';

	let { flow, id, children }: { flow: AuthFlowState; id?: string; children: Snippet } = $props();
</script>

<!-- A step's title: the page's `h1` on `/login` (nothing else names that page), a window's `h2` over any other page. -->
<svelte:element this={flow.pageReturn ? 'h1' : 'h2'} {id} class={flowTitleClass}>
	{@render children()}
</svelte:element>
