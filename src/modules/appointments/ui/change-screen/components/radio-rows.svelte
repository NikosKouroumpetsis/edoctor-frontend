<script lang="ts" module>
	/** `phone`: framed below 744 only (the booking's panel, record §3.2); `always`: framed at every width (`.a-radios`). */
	export type RadioRowsFrame = 'phone' | 'always';

	const frameClasses: Record<RadioRowsFrame, string> = {
		phone: 'rounded-md border border-border px-4 tablet:rounded-none tablet:border-0 tablet:px-0',
		always: 'rounded-md border border-line-2 px-4'
	};
</script>

<script lang="ts">
	import { handleRovingKeydown } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';

	let {
		labelledby,
		label,
		value,
		options,
		onChange,
		frame = 'phone',
		testId
	}: {
		/** The heading that names the group (one of the two names). */
		labelledby?: string;
		/** Its name when no heading on the screen says it. */
		label?: string;
		/** The chosen one, `null` for none yet (screen 53's reason). */
		value: string | null;
		options: { value: string; label: string }[];
		onChange: (value: string) => void;
		frame?: RadioRowsFrame;
		testId?: string;
	} = $props();

	let group = $state<HTMLDivElement | null>(null);
	// One Tab stop: the chosen row, else the first.
	const tabStop = $derived(
		options.some((option) => option.value === value) ? value : options[0]?.value
	);

	function onkeydown(event: KeyboardEvent) {
		if (!group) return;
		const moved = handleRovingKeydown(event, group, { orientation: 'vertical' });
		const next = moved?.dataset.value;
		if (next !== undefined && options.some((option) => option.value === next)) onChange(next);
	}
</script>

<!-- `appt.css:282-288` (the booking's «Είναι το πρώτο σας ραντεβού…;», screen 52's and screen 53's reasons): ONE choice
     as rows of the whole width (56), the radio on the right (24, the chosen one dark with its dot), a thin line between
     rows, framed in the 12 corner. The arrows move the choice. No colour under the pointer (U-100). -->
<div
	bind:this={group}
	role="radiogroup"
	aria-labelledby={labelledby}
	aria-label={labelledby ? undefined : label}
	tabindex={-1}
	data-testid={testId}
	{onkeydown}
	class={cn('flex flex-col', frameClasses[frame])}
>
	{#each options as option, index (option.value)}
		{@const checked = value === option.value}
		<button
			type="button"
			role="radio"
			aria-checked={checked}
			data-roving-item
			data-value={option.value}
			tabindex={tabStop === option.value ? 0 : -1}
			class={cn(
				'group flex min-h-row w-full flex-row items-center justify-between gap-3 text-start text-body-sm font-medium text-foreground outline-none',
				index > 0 && 'border-t border-border'
			)}
			onclick={() => onChange(option.value)}
		>
			<span>{option.label}</span>
			<span
				aria-hidden="true"
				class={cn(
					'flex size-6 shrink-0 items-center justify-center rounded-full group-focus-visible:ring-3 group-focus-visible:ring-ring/50',
					checked ? 'border-2 border-foreground' : 'border border-muted-foreground'
				)}
			>
				{#if checked}<span class="size-3 rounded-full bg-foreground"></span>{/if}
			</span>
		</button>
	{/each}
</div>
