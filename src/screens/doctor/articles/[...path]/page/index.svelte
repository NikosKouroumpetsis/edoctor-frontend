<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import DoctorArticle from '$modules/doctor-dashboard/ui/article';
	import DoctorArticles from '$modules/doctor-dashboard/ui/articles';
	import { useDoctorArticlesScreen } from '../hooks';
	import type { DoctorArticlesScreenProps } from '../types';

	let { data }: DoctorArticlesScreenProps = $props();

	const screen = useDoctorArticlesScreen(() => data);
	const options = $derived({ locale: screen.locale });
	const title = $derived(
		screen.address.view === 'new'
			? m.doctor_my_article_title_new({}, options)
			: screen.address.view === 'article'
				? m.doctor_my_article_title_change({}, options)
				: m.doctor_my_articles_title({}, options)
	);
</script>

<svelte:head>
	<title>{title} | {m.brand_name({}, options)}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<!-- Wave 5.2 · screen 85 «Τα άρθρα μου» (step 9, D-W52-102 / 103): the doctor's articles inside the doctor's frame
     («Μενού» the current tab), one column in the middle (U-215) — or one article's page in its place (U-102), «Νέο
     άρθρο» or one of the doctor's, each starting its own state as a route of its own would (`#key`). -->
{#if screen.address.view === 'list'}
	<DoctorArticles locale={screen.locale} links={screen.links} />
{:else}
	{#key screen.address.view === 'article' ? screen.address.articleId : 'new'}
		<DoctorArticle
			locale={screen.locale}
			articleId={screen.address.view === 'article' ? screen.address.articleId : null}
		/>
	{/key}
{/if}
