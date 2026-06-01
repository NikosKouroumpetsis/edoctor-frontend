<script lang="ts">
	import { QueryProvider } from '$shared/providers';
	import AppShell from '$shared/ui/organisms/app-shell';
	import './layout.css';
	import favicon from '$shared/design/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<QueryProvider>
	<AppShell>
		{@render children()}
	</AppShell>
</QueryProvider>
