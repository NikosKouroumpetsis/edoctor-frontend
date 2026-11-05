<script lang="ts">
	import { articleTypeParam, doctorArticlesTitle } from '$modules/articles/lib/article-list';
	import ArticlesList from '$modules/articles/ui/list';
	import { doctorNameLabel, doctorSentenceName } from '$modules/doctor/lib/detail';
	import { useDoctorArticlesScreen } from '../hooks';
	import type { DoctorArticlesScreenProps } from '../types';

	let { data }: DoctorArticlesScreenProps = $props();

	const profile = $derived(data.load.profile);
	const screen = useDoctorArticlesScreen(
		() => data.load.profile.doctorSlug,
		() => articleTypeParam(data.scope.type)
	);
	const counts = $derived(profile.articlesSummary ?? { articlesCount: 0, healthAdviceCount: 0 });
	const author = $derived({
		title: doctorArticlesTitle(counts, screen.locale),
		name: doctorNameLabel(profile.name, screen.locale),
		sentenceName: doctorSentenceName(profile.name, screen.locale),
		specialty: profile.professional?.name,
		photoUrl: profile.images[0]?.thumbUrl,
		bothKinds: counts.articlesCount > 0 && counts.healthAdviceCount > 0,
		aboutHref: screen.aboutHref,
		profileHref: screen.profileHref,
		doctorsHref: screen.doctorsHref
	});
</script>

<!-- U-77 (the prototype 17 Π2): the articles' list of ONE doctor, drawn whole by the server; below 744 «‹» goes back to
     the profile. -->
<main class="bg-card">
	<ArticlesList
		firstPage={data.list}
		scope={data.scope}
		locale={screen.locale}
		listHref={screen.listHref}
		articleHref={screen.articleHref}
		backHref={screen.profileHref}
		canonicalUrl={screen.canonicalUrl}
		alternateUrls={screen.alternateUrls}
		{author}
	/>
</main>
