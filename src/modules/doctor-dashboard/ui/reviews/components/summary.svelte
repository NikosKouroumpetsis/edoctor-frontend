<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Rating } from '$shared/ui/primitives/rating';
	import type { DoctorReviewsSummaryView } from '$modules/doctor-dashboard/lib/reviews';

	let { summary, locale }: { summary: DoctorReviewsSummaryView; locale: SupportedLocale } =
		$props();

	const options = $derived({ locale });
	const H2 = 'mt-6 mb-2 text-body-md font-semibold text-muted-foreground';
</script>

<!-- 🔴 Screen 84, the summary for the doctor alone (U-218.1, D-W52-85; `64-switch/sw.js` `rvSummary`,
     `sw.css:551-570`): the average over its stars and «N κριτικές», how many of each star 5 → 1 as dark bars, «Επιμέρους
     βαθμοί» in two columns (three from 744) and «Οι ασθενείς αναφέρουν» with the public page's labels. Every number as
     the server gave it; every word a text node (U-65.6). -->
<section
	aria-label={m.doctor_my_reviews_summary({}, options)}
	data-testid="doctor-reviews-summary"
	class="mt-4 flex flex-col gap-4.5 rounded-lg border border-line p-5 tablet:flex-row tablet:items-center"
>
	<div class="flex shrink-0 flex-col items-start gap-1.5 tablet:w-1/4">
		<span
			data-testid="doctor-reviews-average"
			class="text-display-lg leading-flat font-semibold text-foreground">{summary.average}</span
		>
		<Rating
			variant="stars"
			starSize="xs"
			value={summary.averageStars}
			aria-label={summary.averageLabel}
			class="gap-0.5"
		/>
		<span data-testid="doctor-reviews-count" class="text-body-sm text-muted-foreground"
			>{summary.countLabel}</span
		>
	</div>
	<ul class="flex min-w-0 flex-1 flex-col gap-1.5" data-testid="doctor-reviews-distribution">
		{#each summary.bars as bar (bar.star)}
			<li
				data-testid={`doctor-reviews-bar-${bar.star}`}
				class="flex flex-row items-center gap-2.5 text-label-lg text-muted-foreground"
			>
				<span class="w-2.5 shrink-0">{bar.star}</span>
				<span aria-hidden="true" class="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
					<span class="block h-full rounded-full bg-foreground" style:width={`${bar.share * 100}%`}
					></span>
				</span>
				<span class="w-6 shrink-0 text-right">{bar.count}</span>
			</li>
		{/each}
	</ul>
</section>

{#if summary.aspects.length > 0}
	<h2 class={H2}>{m.doctor_my_reviews_aspects({}, options)}</h2>
	<dl data-testid="doctor-reviews-aspects" class="grid grid-cols-2 gap-x-6 tablet:grid-cols-3">
		{#each summary.aspects as aspect (aspect.id)}
			<div
				class="flex flex-row justify-between gap-2 border-b border-line py-2.5 text-body-sm text-foreground"
			>
				<dt>{aspect.label}</dt>
				<dd class="font-semibold">{aspect.value}</dd>
			</div>
		{/each}
	</dl>
{/if}

{#if summary.topics.length > 0}
	<h2 class={H2}>{m.doctor_reviews_mentions_title({}, options)}</h2>
	<ul data-testid="doctor-reviews-topics" class="flex flex-row flex-wrap gap-2">
		{#each summary.topics as topic (topic.id)}
			<li
				class="inline-flex min-h-control-xs items-center gap-2 rounded-full bg-muted px-3 text-label-lg text-foreground"
			>
				{topic.label}<b class="font-semibold">{topic.count}</b>
			</li>
		{/each}
	</ul>
{/if}
