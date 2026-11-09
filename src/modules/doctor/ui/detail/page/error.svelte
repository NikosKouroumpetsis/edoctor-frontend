<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { StatusPage } from '$shared/ui/organisms/status-page';
	import ErrorPage from '../components/error-page.svelte';
	import TopBar from '../components/top-bar.svelte';
	import { useSiteBack } from '$shared/lib/navigation';
	import type { DoctorDetailErrorProps } from '../types';

	let {
		status,
		locale,
		backHref,
		href = (path) => path,
		onRetry
	}: DoctorDetailErrorProps = $props();

	const onBack = useSiteBack();
	const options = $derived({ locale });
	const heading = $derived(m.doctor_not_found_title({}, options));
	const search = $derived({ label: m.doctor_not_found_search({}, options), href: backHref });
	const help = $derived({ label: m.nav_help({}, options), href: href('/help') });
</script>

<!-- 🔴 U-61.1 (the prototype 09 `?v=doctor`): a profile nobody may see (the route's 404) is the site's ONE status page —
     «Ωχ!», «Ο γιατρός δεν βρέθηκε», its line, the code, «Αναζήτηση γιατρών», the useful links and the empty profile
     card; below 744 the bar's «‹», the glyph and the two ways on. A failed read (503) stays as approved in screen 5
     (`components/error-page.svelte`: the «!» and «Δοκιμάστε ξανά»). Never indexed, no canonical. -->
<svelte:head>
	{#if status === 404}
		<title>{m.doctor_error_page_title({ heading }, options)}</title>
		<meta name="robots" content="noindex" />
	{/if}
</svelte:head>

{#if status === 404}
	<TopBar
		{locale}
		{backHref}
		{onBack}
		saved={false}
		onShare={() => {}}
		onSave={() => {}}
		showActions={false}
	/>
	<StatusPage
		oops={m.status_oops({}, options)}
		glyph="medical-outline"
		title={heading}
		text={m.doctor_not_found_body({}, options)}
		codeLabel={m.status_code({ code: String(status) }, options)}
		actions={[search]}
		phoneActions={[search, help]}
		linksTitle={m.status_links_title({}, options)}
		links={[
			{ label: m.status_home({}, options), href: href('/') },
			{ label: m.nav_articles({}, options), href: href('/articles') },
			help
		]}
		art="card"
		{status}
		testId="doctor-detail-error-page"
	/>
{:else}
	<ErrorPage {status} {locale} {backHref} {onBack} {onRetry} />
{/if}
