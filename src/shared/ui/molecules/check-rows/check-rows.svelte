<script lang="ts" module>
	/**
	 * One row: its value, its words (bold) and a muted line under them, already localized. `disabled`: the row cannot be
	 * pressed now (a limit the caller keeps is reached) — it stays in the list, dimmed, and a press changes nothing.
	 */
	export type CheckRowsOption = {
		value: string;
		label: string;
		detail?: string;
		disabled?: boolean;
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Tick } from '$shared/ui/icons/tick';
	import {
		checkboxBoxSizes,
		checkboxBoxStates,
		checkboxTones
	} from '$shared/ui/primitives/checkbox';

	let {
		labelledby,
		label,
		values,
		options,
		onToggle,
		testId
	}: {
		/** The heading that names the group (one of the two names). */
		labelledby?: string;
		/** Its name when no heading on the screen says it. */
		label?: string;
		/** The chosen ones. */
		values: readonly string[];
		options: readonly CheckRowsOption[];
		/** A press: the row's value (the caller decides what the new set is). */
		onToggle: (value: string) => void;
		testId?: string;
	} = $props();

	const tone = checkboxTones.foreground;
</script>

<!-- 🔴 U-112 (`64-switch/sw.css:207-213` `.w-chkrow`, on the 52's `.a-radios` frame): MANY choices as rows of the whole
     width (64), one under the other, never tiles side by side — the words 15/600 over a muted 13 line, the dark box with
     its tick on the right (24, the 6 corner), a thin line between rows, framed in the 12 corner. No colour under the
     pointer (U-100). Every word a text node (U-65.6). A row the caller holds back (`sw.css:512` `.w-chkrow[disabled]`)
     is dimmed and says so to a reader (`aria-disabled`: it keeps its place in the keyboard's order, so the list reads
     whole), and its press reaches nobody. -->
<div
	role="group"
	aria-labelledby={labelledby}
	aria-label={labelledby ? undefined : label}
	data-slot="check-rows"
	data-testid={testId}
	class="flex flex-col rounded-md border border-line-2 px-4"
>
	{#each options as option, index (option.value)}
		{@const checked = values.includes(option.value)}
		<button
			type="button"
			role="checkbox"
			aria-checked={checked}
			aria-disabled={option.disabled ? 'true' : undefined}
			data-value={option.value}
			class={cn(
				'group flex min-h-control-xl w-full flex-row items-center justify-between gap-3 py-2.5 text-start outline-none',
				index > 0 && 'border-t border-border'
			)}
			onclick={() => {
				if (!option.disabled) onToggle(option.value);
			}}
		>
			<span class={cn('grid min-w-0 gap-0.5', option.disabled && 'opacity-45')}>
				<span class="text-body-md font-semibold text-foreground">{option.label}</span>
				{#if option.detail}
					<span class="text-label-lg font-normal text-muted-foreground">{option.detail}</span>
				{/if}
			</span>
			<span
				aria-hidden="true"
				data-slot="check-rows-box"
				data-state={checked ? 'checked' : 'unchecked'}
				class={cn(
					checkboxBoxStates,
					tone.box,
					checkboxBoxSizes.md,
					tone.corner,
					'group-focus-visible:ring-3 group-focus-visible:ring-ring/50',
					option.disabled && 'opacity-45'
				)}
			>
				{#if checked}
					<Tick strokeWidth={3.4} class={cn('icon-check-mark', tone.mark)} />
				{/if}
			</span>
		</button>
	{/each}
</div>
