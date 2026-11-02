<script lang="ts">
	import { QueryProvider } from '$shared/providers';
	import PopularSearches from '$modules/search-doctors/ui/popular-searches';
	import SiteFrame from '$modules/shell/ui/site-frame';
	import './layout.css';
	import favicon from '$shared/design/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<QueryProvider>
	<SiteFrame>
		{#snippet popularSearches()}
			<PopularSearches />
		{/snippet}
		{@render children()}
	</SiteFrame>
</QueryProvider>
