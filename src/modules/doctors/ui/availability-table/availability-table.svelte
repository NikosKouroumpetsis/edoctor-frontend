<script lang="ts">
	import ChevronLeftIcon from '~icons/lucide/chevron-left';
	import ChevronRightIcon from '~icons/lucide/chevron-right';
	import { cn } from '$shared/lib/utils';
	import type { DaySlots } from '$modules/doctors/types';

	let {
		title,
		days,
		selected = $bindable(''),
		canPrev = true,
		canNext = true,
		onPrev,
		onNext,
		onSelect,
		class: className
	}: {
		title?: string;
		days: DaySlots[];
		/** Selected slot key `${date} ${time}`. */
		selected?: string;
		canPrev?: boolean;
		canNext?: boolean;
		onPrev?: () => void;
		onNext?: () => void;
		onSelect?: (date: string, time: string) => void;
		class?: string;
	} = $props();

	function select(date: string, time: string, available: boolean) {
		if (!available) return;
		selected = `${date} ${time}`;
		onSelect?.(date, time);
	}
</script>

<div
	data-slot="availability-table"
	class={cn('w-full rounded-panel border border-border bg-card p-card shadow-raised', className)}
>
	<div class="mb-4 flex items-center justify-between gap-2">
		<button
			type="button"
			aria-label="Previous week"
			disabled={!canPrev}
			onclick={() => onPrev?.()}
			class="inline-flex size-9 items-center justify-center rounded-md hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"
		>
			<ChevronLeftIcon class="size-4" />
		</button>
		<p class="text-title-sm font-semibold">{title ?? 'Availability'}</p>
		<button
			type="button"
			aria-label="Next week"
			disabled={!canNext}
			onclick={() => onNext?.()}
			class="inline-flex size-9 items-center justify-center rounded-md hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"
		>
			<ChevronRightIcon class="size-4" />
		</button>
	</div>

	<div class="grid grid-cols-3 gap-3 md:grid-cols-5">
		{#each days as day (day.date)}
			<div class="flex flex-col">
				<div class="mb-2 text-center">
					<p class="text-label-md text-muted-foreground uppercase">{day.weekday}</p>
					<p class="text-body-sm font-semibold">{day.label}</p>
				</div>
				<div class="flex flex-col gap-2">
					{#each day.slots as slot (slot.time)}
						{@const isSelected = selected === `${day.date} ${slot.time}`}
						<button
							type="button"
							disabled={!slot.available}
							aria-pressed={isSelected}
							onclick={() => select(day.date, slot.time, slot.available)}
							class={cn(
								'rounded-md border px-2 py-1.5 text-body-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
								slot.available
									? 'border-input hover:border-primary hover:bg-primary/5'
									: 'cursor-not-allowed border-transparent bg-muted text-muted-foreground/50 line-through',
								isSelected && 'border-primary bg-primary text-primary-foreground hover:bg-primary'
							)}
						>
							{slot.time}
						</button>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>
