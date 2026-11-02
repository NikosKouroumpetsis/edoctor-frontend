<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { StatusPage, type StatusPageAction } from '$shared/ui/organisms/status-page';
	import { buildStatusPage, type StatusAction } from '$modules/shell/lib/status';
	import type { SiteStatusPageProps } from '../types';

	let {
		status,
		locale,
		href,
		onRetry = () => void invalidateAll()
	}: SiteStatusPageProps = $props();

	const content = $derived(buildStatusPage(status, locale, href));
	const toButtons = (list: StatusAction[]): StatusPageAction[] =>
		list.map((action) => ({
			label: action.label,
			href: action.href,
			onPress: action.retry ? onRetry : undefined,
			testId: action.retry ? 'site-status-retry' : undefined
		}));
</script>

<!-- 🔴 U-61.1 (wave 1.5, screen 9): the site's 404 and error page (the root `+error.svelte`), inside the frame — its
     own title, never indexed, no canonical. A failure's «Δοκιμάστε ξανά» reads the page's loads again
     (`invalidateAll`). -->
<svelte:head>
	<title>{content.documentTitle}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<StatusPage
	oops={content.oops}
	glyph={content.glyph}
	title={content.title}
	text={content.text}
	codeLabel={content.codeLabel || undefined}
	actions={toButtons(content.actions)}
	phoneActions={toButtons(content.phoneActions)}
	linksTitle={content.linksTitle}
	links={content.links}
	art={content.art}
	{status}
	testId="site-status-page"
/>
