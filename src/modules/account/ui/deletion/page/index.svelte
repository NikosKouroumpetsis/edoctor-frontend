<script lang="ts">
	import { page } from '$app/state';
	import { getSupportEmail } from '$shared/config/support';
	import { getPageLocale } from '$shared/preferences/i18n/page-locale';
	import { m } from '$paraglide/messages.js';
	import AppSteps from '../components/app-steps.svelte';
	import SupportRequest from '../components/support-request.svelte';
	import RetentionOverview from '../components/retention-overview.svelte';

	const currentLocale = $derived(getPageLocale(page.url));
	const messageOptions = $derived({ locale: currentLocale });
	const supportEmail = getSupportEmail();
</script>

<svelte:head>
	<title>{m.account_deletion_meta_title({}, messageOptions)}</title>
	<meta name="description" content={m.account_deletion_meta_description({}, messageOptions)} />
</svelte:head>

<main class="container-page py-section">
	<div class="mx-auto flex max-w-tablet flex-col gap-section">
		<header class="flex flex-col gap-3">
			<h1 class="text-heading-xl text-balance text-foreground">
				{m.account_deletion_title({}, messageOptions)}
			</h1>
			<p class="text-body-lg text-muted-foreground">
				{m.account_deletion_intro({}, messageOptions)}
			</p>
		</header>

		<AppSteps {messageOptions} />
		<SupportRequest {messageOptions} {supportEmail} />
		<RetentionOverview {messageOptions} {supportEmail} />
	</div>
</main>
