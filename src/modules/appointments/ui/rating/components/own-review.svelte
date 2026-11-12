<script lang="ts">
	import { Rating } from '$shared/ui/primitives/rating';
	import type { OwnReviewCard } from '$modules/appointments/lib/rating';
	import StatusPill from '$modules/appointments/ui/status-pill';

	let {
		card,
		profileHref,
		policyHref
	}: {
		card: OwnReviewCard;
		/** «Δείτε τη στο προφίλ του γιατρού»: the doctor's reviews on this one (the screen's address), `null` unknown. */
		profileHref: string | null;
		/** «Πολιτική κριτικών» (the legal page, the screen's address). */
		policyHref: string;
	} = $props();
</script>

<!-- 🔴 U-138.5 (record §10.2, `appt.js:214-226`): «Η κριτική σας» on the 51 — its state («Σε έλεγχο» warm, «Δημοσιεύτηκε»
     green, «Δεν δημοσιεύτηκε» neutral: the appointment's pill), the stars (halves, D-W4-27) with the grade and its day,
     the words, the five aspects (two columns from 744), one sentence of its state over a thin line, «Δείτε τη στο προφίλ
     του γιατρού» once published, «Πολιτική κριτικών» once refused, and the doctor's approved reply. U-138.6: «κριτική»,
     what is published. 🔴 U-65.6: every word a person wrote is a text node. -->
<section
	data-testid="appointment-review"
	data-moderation={card.status.tone}
	class="mb-4 rounded-md border border-line bg-background p-4"
>
	<div class="flex flex-row items-center justify-between gap-3">
		<h3 class="text-body-lg font-semibold text-foreground">{card.title}</h3>
		<StatusPill pill={card.status} testId="appointment-review-status" />
	</div>
	{#if card.stars !== null && card.grade}
		<div
			class="mt-1.5 flex flex-row flex-wrap items-center gap-2 text-label-lg text-muted-foreground"
		>
			<Rating variant="stars" value={card.stars} aria-label={card.starsLabel} />
			<span aria-hidden="true" class="font-semibold text-foreground">{card.grade}</span>
			{#if card.date}<span data-testid="appointment-review-date">{card.date}</span>{/if}
		</div>
	{/if}
	{#if card.comment}
		<p
			data-testid="appointment-review-comment"
			class="mt-2 text-body-sm wrap-anywhere whitespace-pre-wrap text-foreground"
		>
			{card.comment}
		</p>
	{/if}
	{#if card.aspects.length > 0}
		<dl
			data-testid="appointment-review-aspects"
			class="mt-3 grid gap-1 text-label-lg tablet:grid-cols-2 tablet:gap-x-section"
		>
			{#each card.aspects as aspect (aspect.id)}
				<div class="flex flex-row justify-between gap-4">
					<dt class="text-muted-foreground">{aspect.name}</dt>
					<dd class="font-semibold text-foreground">{aspect.value}</dd>
				</div>
			{/each}
		</dl>
	{/if}
	{#if card.say}
		<p
			data-testid="appointment-review-say"
			class="mt-3 border-t border-line pt-3 text-label-lg text-foreground"
		>
			{card.say}
		</p>
	{/if}
	<!-- The screen's addresses, already resolved (a module knows no route). -->
	<!-- eslint-disable svelte/no-navigation-without-resolve -->
	{#if card.seeOnProfile && profileHref}
		<a
			href={profileHref}
			data-testid="appointment-review-profile"
			class="inline-flex min-h-touch min-w-touch items-center text-label-lg font-semibold text-foreground underline underline-offset-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
		>
			{card.seeOnProfile}
		</a>
	{/if}
	{#if card.policy}
		<a
			href={policyHref}
			data-testid="appointment-review-policy"
			class="inline-flex min-h-touch min-w-touch items-center text-label-lg font-semibold text-foreground underline underline-offset-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
		>
			{card.policy}
		</a>
	{/if}
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
	{#if card.reply}
		<div
			data-testid="appointment-review-reply"
			class="mt-3 rounded-md border border-line bg-card px-3.5 py-3"
		>
			<p class="text-body-sm font-semibold wrap-anywhere text-foreground">{card.reply.from}</p>
			{#if card.reply.date}
				<p class="text-label-md text-muted-foreground">{card.reply.date}</p>
			{/if}
			<p class="mt-1.5 text-body-sm wrap-anywhere whitespace-pre-wrap text-foreground">
				{card.reply.body}
			</p>
		</div>
	{/if}
</section>
