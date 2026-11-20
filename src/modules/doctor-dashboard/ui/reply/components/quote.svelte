<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Rating } from '$shared/ui/primitives/rating';
	import type { DoctorReviewCard } from '$modules/doctor-dashboard/lib/reviews';

	let { card, locale }: { card: DoctorReviewCard; locale: SupportedLocale } = $props();

	const options = $derived({ locale });
</script>

<!-- 🔴 U-219.2 (`64-switch/sw.js` `rvEditPage`, `sw.css:593-602` `.w-rvquote`): the review the doctor answers, over the
     field — the initials, the name as the public page writes it and its day, the stars, the words, and «Το ραντεβού: …»
     under them, on the faint band. Every word a text node (U-65.6). -->
<div data-testid="doctor-review-reply-quote" class="mb-5 rounded-lg bg-foreground/5 p-4">
	<div class="mb-1.5 flex flex-row items-center gap-3">
		<span
			aria-hidden="true"
			class="flex size-avatar-md shrink-0 items-center justify-center rounded-full bg-foreground/8 text-body-sm font-semibold text-foreground"
			>{card.author.initials}</span
		>
		<span class="grid min-w-0 flex-1">
			<span class="text-body-md font-semibold wrap-anywhere text-foreground"
				>{card.author.name}</span
			>
			<span class="text-label-lg text-muted-foreground">{card.day}</span>
		</span>
	</div>
	<Rating
		variant="stars"
		starSize="xs"
		value={card.stars}
		aria-label={card.starsLabel}
		class="gap-0.5"
	/>
	{#if card.comment}
		<p class="mt-2 text-body-md wrap-anywhere whitespace-pre-line text-foreground">
			{card.comment}
		</p>
	{:else}
		<p class="mt-2 text-body-sm text-muted-foreground">
			{m.doctor_my_reviews_no_comment({}, options)}
		</p>
	{/if}
	{#if card.visit}
		<p data-testid="doctor-review-reply-visit" class="mt-2.5 text-label-lg text-muted-foreground">
			{m.doctor_my_reviews_appointment_line({ visit: card.visit }, options)}
		</p>
	{/if}
</div>
