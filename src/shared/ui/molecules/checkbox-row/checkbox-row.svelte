<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn } from '$shared/lib/utils';
	import { Tick } from '$shared/ui/icons/tick';
	import {
		checkboxBoxHover,
		checkboxBoxSizes,
		checkboxBoxStates,
		checkboxMarkSizes,
		checkboxTones,
		type CheckboxTone
	} from '$shared/ui/primitives/checkbox';

	let {
		label,
		count,
		checked = $bindable(false),
		onToggle,
		testId,
		disabled = false,
		hover = true,
		tone = 'primary',
		class: className,
		...restProps
	}: Omit<HTMLButtonAttributes, 'children' | 'onclick'> & {
		/** The row's words, already localized; also its whole name (the application's `accessibilityLabel`). */
		label: string;
		/** The count in the caller's words («12»); `''` is drawn (empty), only `undefined` draws none (the application's). */
		count?: string;
		checked?: boolean;
		/** The press: the new state comes along (the application's `onToggle`). */
		onToggle?: (checked: boolean) => void;
		testId?: string;
		/** U-28.4 (`true`, the default): an empty box darkens under the pointer; `false` (U-100, D-W3-27) never. */
		hover?: boolean;
		/** The ticked box's colours (`checkboxTones`, U-129.2): the screen's own prototype. */
		tone?: CheckboxTone;
	} = $props();

	function toggle() {
		if (disabled) return;
		checked = !checked;
		onToggle?.(checked);
	}
</script>

<!-- The application's `ServiceRow` (M-38): the whole row is the checkbox — the 24 box of `Checkbox`, the 15 words
     on one line, the muted count. It lives in an accordion that clips at its edges, so the web's ring is inset, in
     the row's own 4 / 8 of padding (as `PillTabs`). -->
<button
	type="button"
	role="checkbox"
	aria-checked={checked}
	aria-label={label}
	data-slot="checkbox-row"
	data-state={checked ? 'checked' : 'unchecked'}
	data-testid={testId}
	{disabled}
	onclick={toggle}
	class={cn(
		'group flex min-h-touch w-full flex-row items-center gap-3 rounded-md px-1 py-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	{...restProps}
>
	<span class="inline-flex size-touch shrink-0 items-center justify-center" aria-hidden="true">
		<span
			data-slot="checkbox-row-box"
			data-state={checked ? 'checked' : 'unchecked'}
			data-tone={tone}
			class={cn(
				checkboxBoxStates,
				checkboxTones[tone].box,
				hover && checkboxBoxHover,
				checkboxBoxSizes.md,
				checkboxTones[tone].corner
			)}
		>
			{#if checked && checkboxTones[tone].tick}
				<Tick strokeWidth={3.4} class={cn('icon-check-mark', checkboxTones[tone].mark)} />
			{:else if checked}
				<span class={cn('font-bold', checkboxTones[tone].mark, checkboxMarkSizes.md)}>✓</span>
			{/if}
		</span>
	</span>
	<span class="flex min-w-0 flex-1 flex-col">
		<span class="line-clamp-1 text-body-md text-foreground">{label}</span>
	</span>
	{#if count !== undefined}
		<span data-slot="checkbox-row-count" class="shrink-0 text-label-md text-muted-foreground"
			>{count}</span
		>
	{/if}
</button>
