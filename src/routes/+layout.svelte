<script lang="ts">
	import { QueryProvider } from '$shared/providers';
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
		{@render children()}
	</SiteFrame>
</QueryProvider>
