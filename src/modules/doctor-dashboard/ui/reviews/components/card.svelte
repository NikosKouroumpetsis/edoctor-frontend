<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { LinkCard } from '$shared/ui/molecules/link-card';
	import { Button } from '$shared/ui/primitives/button';
	import { Rating } from '$shared/ui/primitives/rating';
	import { TextButton } from '$shared/ui/primitives/text-button';
	import type { DoctorReviewCard } from '$modules/doctor-dashboard/lib/reviews';

	let {
		card,
		locale,
		replyHref,
		reportHref,
		appointmentHref,
		onOpen,
		onDelete
	}: {
		card: DoctorReviewCard;
		locale: SupportedLocale;
		/** The page of the reply (a new one, its change, a new one after a rejection). */
		replyHref: string;
		/** The page of the report. */
		reportHref: string;
		/** The appointment the review names (screen 68). */
		appointmentHref: string;
		/** A press of one of the card's pages: the caller opens it one step on in the history. */
		onOpen: (event: MouseEvent) => void;
		/** «Διαγραφή» of the reply: the caller asks first. */
		onDelete: () => void;
	} = $props();

	const options = $derived({ locale });
	const reply = $derived(card.reply);
</script>

<!-- 🔴 Screen 84, one review (U-218.1, U-219.2, D-W52-91; `64-switch/sw.js` `rvCard`, `sw.css:575-602`): the initials in
     the faint circle, the name as the public page writes it and the day, «Αναφορά» at the right (none once reported),
     the stars, the words (or «Μόνο βαθμός, χωρίς σχόλιο.»), «Το ραντεβού · …» ⇒ screen 68, the report's sentence while
     the team examines it, and the reply in its four states. Every word a text node (U-65.6); no colour under the
     pointer (U-100). -->
<li
	id={`doctor-review-${card.id}`}
	data-testid={`doctor-review-${card.id}`}
	data-reply={reply.state}
	tabindex="-1"
	class="scroll-mt-section border-b border-line py-5 outline-none"
>
	<div class="mb-2 flex flex-row items-center gap-3">
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
		{#if !card.reported}
			<TextButton
				label={m.doctor_my_reviews_report({}, options)}
				aria-label={m.doctor_my_reviews_report_label({ name: card.author.name }, options)}
				href={reportHref}
				tone="muted"
				underline
				textClass="text-label-lg font-normal"
				onclick={onOpen}
				data-testid={`doctor-review-${card.id}-report`}
				class="-my-3 shrink-0 justify-end self-start"
			/>
		{/if}
	</div>
	<Rating
		variant="stars"
		starSize="xs"
		value={card.stars}
		aria-label={card.starsLabel}
		class="gap-0.5"
		data-testid={`doctor-review-${card.id}-stars`}
	/>
	{#if card.comment}
		<p
			data-testid={`doctor-review-${card.id}-comment`}
			class="mt-2 text-body-md wrap-anywhere whitespace-pre-line text-foreground"
		>
			{card.comment}
		</p>
	{:else}
		<p class="mt-2 text-body-sm text-muted-foreground">
			{m.doctor_my_reviews_no_comment({}, options)}
		</p>
	{/if}
	{#if card.visit}
		<LinkCard
			href={appointmentHref}
			icon="calendar-outline"
			label={m.doctor_my_reviews_appointment({}, options)}
			title={card.visit}
			onclick={onOpen}
			testId={`doctor-review-${card.id}-appointment`}
			class="mt-3.5"
		/>
	{/if}
	{#if card.reported}
		<p
			data-testid={`doctor-review-${card.id}-reported`}
			class="mt-2 text-label-lg text-muted-foreground"
		>
			{m.doctor_my_reviews_reported({}, options)}
		</p>
	{/if}
	{#if reply.state === 'none'}
		<Button
			tone="outline"
			radius="full"
			hover={false}
			textClass="text-body-sm"
			href={replyHref}
			label={m.doctor_my_reviews_reply({}, options)}
			onclick={onOpen}
			data-testid={`doctor-review-${card.id}-reply`}
			class="mt-3.5"
		/>
	{:else}
		<div
			data-testid={`doctor-review-${card.id}-answer`}
			class="mt-3.5 border-l-2 border-line-2 py-0.5 pl-3.5"
		>
			<p
				class={[
					'text-label-lg font-semibold',
					reply.state === 'rejected' ? 'text-accent' : 'text-foreground'
				]}
			>
				{#if reply.state === 'pending'}
					{m.doctor_my_reviews_reply_pending({}, options)}
				{:else if reply.state === 'published'}
					{reply.day
						? m.doctor_my_reviews_reply_published({ date: reply.day }, options)
						: m.doctor_my_reviews_reply_published_undated({}, options)}
				{:else}
					{m.doctor_my_reviews_reply_rejected({}, options)}
				{/if}
			</p>
			<p
				data-testid={`doctor-review-${card.id}-answer-text`}
				class={[
					'mt-1 text-body-sm wrap-anywhere whitespace-pre-line',
					reply.state === 'rejected' ? 'text-muted-foreground' : 'text-foreground'
				]}
			>
				{reply.text}
			</p>
			{#if reply.state === 'pending'}
				<p class="mt-1.5 text-label-lg text-muted-foreground">
					{m.doctor_my_reviews_reply_pending_note({}, options)}
				</p>
			{/if}
			{#if reply.state === 'rejected'}
				<!-- 🔴 D-W52-86α: the team's reason, as text (U-65.6); without one (old data) the sentence alone. -->
				<p
					data-testid={`doctor-review-${card.id}-rejected-note`}
					class="mt-1.5 text-label-lg wrap-anywhere text-muted-foreground"
				>
					{reply.note}
				</p>
				<Button
					tone="outline"
					radius="full"
					hover={false}
					textClass="text-body-sm"
					href={replyHref}
					label={m.doctor_my_reviews_reply_new({}, options)}
					onclick={onOpen}
					data-testid={`doctor-review-${card.id}-reply`}
					class="mt-3.5"
				/>
			{:else}
				<div class="flex flex-row gap-4">
					<TextButton
						label={m.booking_summary_change({}, options)}
						aria-label={m.doctor_my_reviews_change_label({ name: card.author.name }, options)}
						href={replyHref}
						tone="foreground"
						underline
						onclick={onOpen}
						data-testid={`doctor-review-${card.id}-change`}
					/>
					<TextButton
						label={m.doctor_photos_delete({}, options)}
						aria-label={m.doctor_my_reviews_delete_label({ name: card.author.name }, options)}
						tone="foreground"
						underline
						onclick={onDelete}
						data-testid={`doctor-review-${card.id}-delete`}
					/>
				</div>
			{/if}
		</div>
	{/if}
</li>
