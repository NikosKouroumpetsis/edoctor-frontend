<script lang="ts" module>
	/** `phone`: framed below 744 only (a panel's rows); `always`: framed at every width (`.a-radios`). */
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
		/** The chosen one, `null` for none yet (a reason that must be picked first). */
		value: string | null;
		/**
		 * Each row's words; `note` a quiet word after the label («όπως είναι τώρα», `sw.css:223` `.w-now`); `detail` a muted
		 * line under a bold label (`sw.css:255-257` `.w-rb` / `.w-rs`: an office and its address, a service and its price).
		 */
		options: { value: string; label: string; note?: string; detail?: string }[];
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

<!-- `appt.css:282-288` (the wave 4 reasons and choices; shared since D-W51-50): ONE choice as rows of the whole width
     (56), the radio on the right (24, the chosen one dark with its dot), a thin line between rows, framed in the 12
     corner; a row's quiet note after its label (D-W51-62, 12 muted); a row with a detail (D-W51-70, `sw.css:255-257`) of
     64, its label 15/600 and the detail 13 muted under it. The arrows move the choice. No colour under the pointer
     (U-100). Every word a text node (U-65.6). -->
<div
	bind:this={group}
	role="radiogroup"
	aria-labelledby={labelledby}
	aria-label={labelledby ? undefined : label}
	tabindex={-1}
	data-slot="radio-rows"
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
				option.detail && 'min-h-control-xl',
				index > 0 && 'border-t border-border'
			)}
			onclick={() => onChange(option.value)}
		>
			{#if option.detail}
				<span class="flex min-w-0 flex-col py-2.5">
					<span class="text-body-md font-semibold">{option.label}</span>
					<small
						data-slot="radio-rows-detail"
						class="mt-0.5 text-label-lg font-normal text-muted-foreground">{option.detail}</small
					>
				</span>
			{:else if option.note}
				<span>
					{option.label}
					<small
						data-slot="radio-rows-note"
						class="ms-1.5 text-label-md font-normal text-muted-foreground">{option.note}</small
					>
				</span>
			{:else}
				<span>{option.label}</span>
			{/if}
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
