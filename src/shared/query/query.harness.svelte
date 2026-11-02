<script lang="ts">
	import type { Component } from 'svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';

	/**
	 * Tests only: renders a component that reads TanStack Query inside its own client (no retries, nothing
	 * collected while the test runs), as the app's `QueryProvider` does around every page. Any component fits
	 * `Component<never>`; its props are the caller's to match.
	 */
	let { component, props = {} }: { component: Component<never>; props?: Record<string, unknown> } =
		$props();

	const Inner = $derived(component as unknown as Component<Record<string, unknown>>);
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: Infinity } }
	});
</script>

<QueryClientProvider {client}>
	<Inner {...props} />
</QueryClientProvider>
