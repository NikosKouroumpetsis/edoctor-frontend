<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { EmptyState } from '$shared/ui/molecules/empty-state';
	import TopBar from './top-bar.svelte';

	let {
		status,
		locale,
		backHref,
		onBack,
		onRetry
	}: {
		/** The route's answer: 404 a profile nobody may see (or an unknown window), anything else a failed read. */
		status: number;
		locale: SupportedLocale;
		backHref: ResolvedPathname;
		onBack: (event: MouseEvent) => void;
		onRetry: () => void;
	} = $props();

	const options = $derived({ locale });
	const missing = $derived(status === 404);
	const heading = $derived(
		missing ? m.doctor_not_found_title({}, options) : m.doctor_error_title({}, options)
	);
</script>

<!-- 🔴 U-34 / MINOR-6 of r1 (app = web, the application's error page): the route's 404 or 503 — its own title, never
     indexed (no canonical). A failed read: «Δεν ήταν δυνατή η φόρτωση του ιατρού», its line and «Δοκιμάστε ξανά» (the
     route's read again); a missing profile: its words and the way to the search. The phone's bar keeps «‹» alone. -->
<svelte:head>
	<title>{m.doctor_error_page_title({ heading }, options)}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<TopBar
	{locale}
	{backHref}
	{onBack}
	saved={false}
	onShare={() => {}}
	onSave={() => {}}
	showActions={false}
/>
<div
	data-testid="doctor-detail-error-page"
	data-status={status}
	class="flex min-h-page flex-col items-center justify-center px-6 pt-section pb-section-lg"
>
	{#snippet glyph()}
		<span class="grid size-control-xl place-items-center rounded-full bg-foreground/5">
			<Ionicon name="alert-circle" class="icon-lg text-muted-foreground" />
		</span>
	{/snippet}
	{#if missing}
		<EmptyState
			title={heading}
			description={m.doctor_not_found_body({}, options)}
			actionLabel={m.doctor_not_found_search({}, options)}
			actionHref={backHref}
			titleAs="h1"
			testId="doctor-detail-not-found"
			icon={glyph}
		/>
	{:else}
		<EmptyState
			title={heading}
			description={m.doctor_error_body({}, options)}
			actionLabel={m.doctor_error_retry({}, options)}
			onActionPress={onRetry}
			titleAs="h1"
			testId="doctor-detail-error"
			icon={glyph}
		/>
	{/if}
</div>
