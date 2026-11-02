<script lang="ts">
	import ErrorPage from '../components/error-page.svelte';
	import { useSiteBack } from '../hooks/use-site-back.svelte';
	import type { DoctorDetailErrorProps } from '../types';

	let { status, locale, backHref, onRetry }: DoctorDetailErrorProps = $props();

	const onBack = useSiteBack();
</script>

<!-- 🔴 MINOR-6 of r1: the profile's error page (the route's `+error.svelte`): a 404 or a failed read, never indexed. -->
<ErrorPage {status} {locale} {backHref} {onBack} {onRetry} />
