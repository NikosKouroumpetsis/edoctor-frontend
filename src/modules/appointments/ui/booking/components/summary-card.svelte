<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import type { BookingCard, BookingCardRow, BookingStep } from '$modules/appointments/lib/booking';
	import ChangeLink from './change-link.svelte';

	let {
		card,
		stepHref,
		onOpenStep,
		onFeeSignIn,
		testId = 'booking-card'
	}: {
		card: BookingCard;
		/** A row's screen as an address (already localized and resolved). */
		stepHref: (step: BookingStep) => string;
		onOpenStep: (step: BookingStep, event: MouseEvent) => void;
		/** U-34.4: a guest's «Συνδεθείτε για κόστος». */
		onFeeSignIn?: () => void;
		testId?: string;
	} = $props();

	const lineClasses = {
		muted: 'mt-1 text-label-lg font-normal text-muted-foreground',
		danger: 'mt-1 text-label-lg font-medium text-danger-text',
		warning:
			'mt-2.5 rounded-md border border-warning/40 bg-warning/10 px-3 py-2.5 text-label-lg font-normal text-foreground'
	} as const;
	const valueClasses: Record<NonNullable<BookingCardRow['valueStyle']> | 'plain', string> = {
		plain: 'mt-1 text-body-sm text-foreground',
		money: 'mt-1 text-body-lg font-semibold text-foreground',
		'status-pending':
			'mt-1 inline-flex min-h-6 items-center rounded-full border border-warning/40 bg-warning/10 px-2.5 text-label-md font-medium text-foreground',
		'status-confirmed':
			'mt-1 inline-flex min-h-6 items-center rounded-full border border-success/40 bg-success/10 px-2.5 text-label-md font-medium text-success-text'
	};
</script>

<!-- Record §3.2 (screens 30 and 31): the doctor — photo 80 (96 from 744), specialty, name, ★ and the reviews — then one row
     per fact, a thin line between them, the label 14/600 over its value 14/400 and the «Αλλαγή» on the right. 12 corner and
     16 inside below 744, 24 and 24 from it. Every word a person or the server wrote is a text node (U-65.6). -->
<section
	data-slot="booking-card"
	data-testid={testId}
	class="rounded-md border border-border bg-card p-4 tablet:rounded-xl tablet:p-6"
>
	<div class="flex flex-row gap-4 pb-4">
		<div
			class="size-checkout-photo shrink-0 overflow-hidden rounded-sm bg-muted tablet:size-avatar-2xl tablet:rounded-md"
		>
			{#if card.head.photo}
				<img
					src={card.head.photo.src}
					alt={card.head.photo.alt}
					class="size-full object-cover"
					loading="lazy"
				/>
			{/if}
		</div>
		<div class="min-w-0 flex-1">
			<p class="text-label-lg font-medium text-muted-foreground">{card.head.specialty}</p>
			<p class="mt-0.5 text-body-lg font-semibold text-foreground">{card.head.name}</p>
			{#if card.head.rating}
				<p
					class="mt-1.5 flex flex-row items-center gap-1 text-label-md font-medium text-foreground"
				>
					<Ionicon name="star" class="icon-xs text-rating" />
					<span aria-hidden="true">{card.head.rating.score}</span>
					<span aria-hidden="true" class="text-muted-foreground">({card.head.rating.reviews})</span>
					<span class="sr-only">{card.head.rating.label} · {card.head.rating.reviews}</span>
				</p>
			{/if}
		</div>
	</div>

	{#each card.rows as row (row.id)}
		<div
			data-slot="booking-card-row"
			data-row={row.id}
			class="flex flex-row items-start justify-between gap-3 border-t border-border py-4 last:pb-0"
		>
			<div class="min-w-0 flex-1">
				<p class="text-body-sm font-semibold text-foreground">{row.label}</p>
				{#if row.value}
					<p class={valueClasses[row.valueStyle ?? 'plain']}>{row.value}</p>
				{/if}
				{#if row.signIn}
					<button
						type="button"
						data-testid="booking-fee-sign-in"
						class="-my-2.5 inline-flex min-h-touch min-w-touch flex-row items-center gap-1 text-body-sm font-medium text-foreground underline underline-offset-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
						onclick={() => onFeeSignIn?.()}
					>
						<Ionicon name="lock-closed-outline" class="icon-sm" />
						<span>{row.signIn}</span>
					</button>
				{/if}
				{#each row.lines as line, index (index)}
					<p class={cn(lineClasses[line.tone])} data-tone={line.tone}>{line.text}</p>
				{/each}
			</div>
			{#if row.action}
				{@const action = row.action}
				<ChangeLink
					{action}
					href={stepHref(action.step)}
					onOpen={(event) => onOpenStep(action.step, event)}
				/>
			{/if}
		</div>
	{/each}
</section>
