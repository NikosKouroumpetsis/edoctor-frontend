<script lang="ts" module>
	/** A phone as the row shows it and as `tel:` takes it (digits and one `+`). */
	export type FactRowPhone = { label: string; dial: string };

	/** One labelled fact under the row's label («Κινητό · +30 …»): a phone dials (`dial`), the rest is text. */
	export type FactRowPair = { id: string; label: string; value: string; dial?: string };

	/** Two amounts or more: each, then the total. */
	export type FactRowBreakdown = {
		lines: { label: string; amount: string }[];
		totalLabel: string;
		total: string;
	};

	/** The row's way to change its fact: a link to a new screen (U-102). */
	export type FactRowChange = {
		label: string;
		ariaLabel: string;
		href: string;
		step?: string;
		onOpen?: (event: MouseEvent) => void;
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { ChangeLink } from '$shared/ui/molecules/change-link';

	let {
		row,
		label,
		values = [],
		emphasis = false,
		muted = false,
		phone = null,
		pairs = [],
		breakdown = null,
		notes = [],
		hint = null,
		change = null,
		phoneTestId,
		testId
	}: {
		/** The row's name on the page, for the tests and the styles (`data-row`). */
		row: string;
		/** What the fact is, already localized. */
		label: string;
		/** Its values, each on its own line. */
		values?: readonly string[];
		/** The values large and bold (an amount). */
		emphasis?: boolean;
		/** The values in the muted colour: what was never given («Δεν έχει δοθεί», screen 73's `.w-none2`). */
		muted?: boolean;
		/** A phone that calls, under the values. */
		phone?: FactRowPhone | null;
		/** Labelled facts in two columns, under the values. */
		pairs?: readonly FactRowPair[];
		breakdown?: FactRowBreakdown | null;
		/** Muted lines of what the fact is now («Τελική τιμή που ορίσατε.»), before the hint. */
		notes?: readonly string[];
		/** Muted words under it all. */
		hint?: string | null;
		change?: FactRowChange | null;
		phoneTestId?: string;
		testId?: string;
	} = $props();
</script>

<!-- One fact of a card (D-W51-37: the approved `appt.css` `.a-row`, shared by every card that lists facts): its label
     14/600, its values 14 (or 18/600 for an amount), a phone that calls, labelled pairs (the muted label 72 wide, the
     value beside it, a phone in the link's colour), the amounts and their total, muted lines — and its change at the
     end. A thin line above each row; every word a text node (U-65.6). -->
<div
	data-slot="fact-row"
	data-row={row}
	data-testid={testId}
	class="flex flex-row items-start justify-between gap-3 border-t border-line py-4 last:pb-0"
>
	<div class="min-w-0 flex-1">
		<p class="text-body-sm font-semibold text-foreground">{label}</p>
		{#each values as value, index (index)}
			<p
				class={cn(
					'mt-1',
					muted ? 'text-muted-foreground' : 'text-foreground',
					emphasis ? 'text-body-lg font-semibold' : 'text-body-sm'
				)}
			>
				{value}
			</p>
		{/each}
		{#if phone}
			<p class="mt-1 text-body-sm">
				<a
					href={`tel:${phone.dial}`}
					data-testid={phoneTestId}
					class="-my-3 inline-flex min-h-touch min-w-touch items-center font-semibold text-primary-text outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
				>
					{phone.label}
				</a>
			</p>
		{/if}
		{#if pairs.length > 0}
			<dl data-slot="fact-row-pairs" class="mt-2 grid gap-1.5">
				{#each pairs as pair (pair.id)}
					<div data-pair={pair.id} class="flex flex-row gap-3 text-body-sm">
						<dt class="w-row-lg shrink-0 text-muted-foreground">{pair.label}</dt>
						<dd class="min-w-0 flex-1 font-medium wrap-anywhere text-foreground">
							{#if pair.dial}
								<a
									href={`tel:${pair.dial}`}
									class="-my-3 inline-flex min-h-touch min-w-touch items-center font-semibold text-primary-text outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
								>
									{pair.value}
								</a>
							{:else}
								{pair.value}
							{/if}
						</dd>
					</div>
				{/each}
			</dl>
		{/if}
		{#if breakdown}
			<div class="mt-1.5 grid gap-1.5 text-body-sm text-foreground">
				{#each breakdown.lines as line, index (index)}
					<p class="flex flex-row justify-between gap-4">
						<span>{line.label}</span><span class="shrink-0">{line.amount}</span>
					</p>
				{/each}
				<p
					class="flex flex-row justify-between gap-4 border-t border-line pt-2 text-body-lg font-semibold"
				>
					<span>{breakdown.totalLabel}</span><span class="shrink-0">{breakdown.total}</span>
				</p>
			</div>
		{/if}
		{#each notes as note, index (index)}
			<p data-slot="fact-row-note" class="mt-1 text-label-lg font-normal text-muted-foreground">
				{note}
			</p>
		{/each}
		{#if hint}
			<p class="mt-1 text-label-lg font-normal text-muted-foreground">{hint}</p>
		{/if}
	</div>
	{#if change}
		<ChangeLink
			label={change.label}
			ariaLabel={change.ariaLabel}
			step={change.step}
			href={change.href}
			onOpen={change.onOpen}
		/>
	{/if}
</div>
