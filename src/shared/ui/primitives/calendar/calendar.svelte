<script lang="ts">
	import {
		CalendarDate,
		DateFormatter,
		getLocalTimeZone,
		isSameDay,
		isSameMonth,
		isToday,
		startOfMonth,
		endOfMonth,
		startOfWeek,
		endOfWeek,
		today
	} from '@internationalized/date';
	import ChevronLeftIcon from '~icons/lucide/chevron-left';
	import ChevronRightIcon from '~icons/lucide/chevron-right';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		value = $bindable<CalendarDate | undefined>(undefined),
		locale = 'en-US',
		minValue,
		maxValue,
		class: className,
		onValueChange,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		value?: CalendarDate;
		locale?: string;
		minValue?: CalendarDate;
		maxValue?: CalendarDate;
		onValueChange?: (value: CalendarDate) => void;
	} = $props();

	const tz = getLocalTimeZone();
	let displayMonth = $state<CalendarDate>(value ?? today(tz));
	let focusedDate = $state<CalendarDate>(value ?? today(tz));

	const monthLabelFmt = $derived(new DateFormatter(locale, { month: 'long', year: 'numeric' }));
	const weekdayFmt = $derived(new DateFormatter(locale, { weekday: 'short' }));

	const weeks = $derived.by(() => {
		const gridStart = startOfWeek(startOfMonth(displayMonth), locale);
		const gridEnd = endOfWeek(endOfMonth(displayMonth), locale);
		const days: CalendarDate[] = [];
		let cursor = gridStart;
		while (cursor.compare(gridEnd) <= 0) {
			days.push(cursor);
			cursor = cursor.add({ days: 1 });
		}
		const result: CalendarDate[][] = [];
		for (let i = 0; i < days.length; i += 7) result.push(days.slice(i, i + 7));
		return result;
	});

	const weekdayLabels = $derived(weeks[0]?.map((d) => weekdayFmt.format(d.toDate(tz))) ?? []);

	function isDisabled(date: CalendarDate): boolean {
		if (minValue && date.compare(minValue) < 0) return true;
		if (maxValue && date.compare(maxValue) > 0) return true;
		return false;
	}

	function select(date: CalendarDate) {
		if (isDisabled(date)) return;
		value = date;
		focusedDate = date;
		onValueChange?.(date);
	}

	function shiftMonth(delta: number) {
		displayMonth = displayMonth.add({ months: delta });
	}

	function moveFocus(deltaDays: number) {
		focusedDate = focusedDate.add({ days: deltaDays });
		if (!isSameMonth(focusedDate, displayMonth)) displayMonth = startOfMonth(focusedDate);
	}

	function onGridKeydown(event: KeyboardEvent) {
		switch (event.key) {
			case 'ArrowLeft':
				moveFocus(-1);
				break;
			case 'ArrowRight':
				moveFocus(1);
				break;
			case 'ArrowUp':
				moveFocus(-7);
				break;
			case 'ArrowDown':
				moveFocus(7);
				break;
			case 'Enter':
			case ' ':
				select(focusedDate);
				break;
			default:
				return;
		}
		event.preventDefault();
		// Move DOM focus to the newly focused day cell.
		queueMicrotask(() => {
			ref?.querySelector<HTMLButtonElement>(`[data-date="${focusedDate.toString()}"]`)?.focus();
		});
	}
</script>

<div
	bind:this={ref}
	data-slot="calendar"
	class={cn('w-fit rounded-control border border-border bg-card p-3', className)}
	{...restProps}
>
	<div class="mb-2 flex items-center justify-between">
		<button
			type="button"
			aria-label="Previous month"
			onclick={() => shiftMonth(-1)}
			class="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
		>
			<ChevronLeftIcon class="size-4" />
		</button>
		<div data-slot="calendar-heading" class="text-body-sm font-medium" aria-live="polite">
			{monthLabelFmt.format(displayMonth.toDate(tz))}
		</div>
		<button
			type="button"
			aria-label="Next month"
			onclick={() => shiftMonth(1)}
			class="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
		>
			<ChevronRightIcon class="size-4" />
		</button>
	</div>

	<table role="grid" class="border-collapse" onkeydown={onGridKeydown}>
		<thead>
			<tr>
				{#each weekdayLabels as label (label)}
					<th class="size-9 text-label-md font-normal text-muted-foreground" scope="col">{label}</th
					>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each weeks as week, i (i)}
				<tr>
					{#each week as day (day.toString())}
						{@const selected = value ? isSameDay(day, value) : false}
						{@const outside = !isSameMonth(day, displayMonth)}
						{@const disabled = isDisabled(day)}
						<td role="gridcell" aria-selected={selected} class="p-0">
							<button
								type="button"
								data-date={day.toString()}
								data-slot="calendar-day"
								data-selected={selected ? '' : undefined}
								data-today={isToday(day, tz) ? '' : undefined}
								data-outside={outside ? '' : undefined}
								{disabled}
								tabindex={isSameDay(day, focusedDate) ? 0 : -1}
								onclick={() => select(day)}
								class={cn(
									'inline-flex size-9 items-center justify-center rounded-md text-body-sm outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50',
									'data-[today]:font-semibold data-[today]:text-primary',
									'data-[outside]:text-muted-foreground/50',
									'data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[selected]:hover:bg-primary',
									'disabled:pointer-events-none disabled:opacity-30'
								)}
							>
								{day.day}
							</button>
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>
