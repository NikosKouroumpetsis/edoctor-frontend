<script lang="ts" module>
	export type CheckboxSize = 'sm' | 'md' | 'lg';

	/** The application's box per size (20 / 24 / 32) and its «✓» text, inside the 48 touch button. */
	export const checkboxBoxSizes: Record<CheckboxSize, string> = {
		sm: 'size-5 rounded-xs',
		md: 'size-6 rounded-sm',
		lg: 'size-control-xs rounded-sm'
	};
	export const checkboxMarkSizes: Record<CheckboxSize, string> = {
		sm: 'text-label-md',
		md: 'text-label-md',
		lg: 'text-label-lg'
	};
	/**
	 * The drawn box in its states (a row that is itself the checkbox draws the same box, `CheckboxRow`), and its hover.
	 * U-28.4: with a pointer, an empty box darkens its border while its button (the `group`) is hovered; a ticked or
	 * disabled one does not. `hover={false}` (U-100: a caller with no hover) leaves the hover out.
	 */
	export const checkboxBoxStates =
		'flex items-center justify-center border border-input bg-card transition-colors duration-standard ease-standard';

	/**
	 * 🔴 U-129.2 · the ticked box's fill and its mark, each screen as its own prototype: `primary` (the default), `foreground`
	 * (the doctor sign-up, `33-doctor` `.d-box`: `--fg`, the mark `--page`), `secondary` (the account's register form,
	 * wave 2 `19-login/login.css:275`: `--dark`, the mark `--dark-fg`). Both themes are the tokens' own. `foreground` also
	 * takes the prototype's corner and tick (`.d-box`: `rounded-checkbox` 6; `ico('tick', 14, 3.4)`: `icon-check-mark`).
	 */
	export type CheckboxTone = 'primary' | 'foreground' | 'secondary';
	export const checkboxTones: Record<
		CheckboxTone,
		{ box: string; mark: string; corner?: string; tick?: boolean }
	> = {
		primary: {
			box: 'data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary',
			mark: 'text-primary-foreground'
		},
		foreground: {
			box: 'data-[state=checked]:border-foreground data-[state=checked]:bg-foreground data-[state=indeterminate]:border-foreground data-[state=indeterminate]:bg-foreground',
			mark: 'text-card',
			corner: 'rounded-checkbox',
			tick: true
		},
		secondary: {
			box: 'data-[state=checked]:border-secondary data-[state=checked]:bg-secondary data-[state=indeterminate]:border-secondary data-[state=indeterminate]:bg-secondary',
			mark: 'text-secondary-foreground'
		}
	};
	export const checkboxBoxHover =
		'can-hover:group-enabled:group-hover:data-[state=unchecked]:border-foreground';
</script>

<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { Tick } from '$shared/ui/icons/tick';

	let {
		ref = $bindable(null),
		checked = $bindable(false),
		indeterminate = $bindable(false),
		size = 'md',
		class: className,
		disabled,
		name,
		value = 'on',
		required,
		onCheckedChange,
		hover = true,
		tone = 'primary',
		...restProps
	}: WithElementRef<HTMLButtonAttributes, HTMLButtonElement> & {
		checked?: boolean;
		/** The mixed state of a parent checkbox (`aria-checked="mixed"`), as the application's (R4-1). */
		indeterminate?: boolean;
		size?: CheckboxSize;
		name?: string;
		value?: string;
		required?: boolean;
		onCheckedChange?: (checked: boolean) => void;
		/** U-28.4 (`true`, the default): an empty box darkens under the pointer; `false` (U-100, D-W3-27) never. */
		hover?: boolean;
		/** The ticked box's colours (`checkboxTones`): the screen's own prototype. */
		tone?: CheckboxTone;
	} = $props();

	const state = $derived(indeterminate ? 'indeterminate' : checked ? 'checked' : 'unchecked');

	function toggle() {
		if (disabled) return;
		indeterminate = false;
		checked = !checked;
		onCheckedChange?.(checked);
	}
</script>

<button
	bind:this={ref}
	type="button"
	role="checkbox"
	aria-checked={indeterminate ? 'mixed' : checked}
	aria-required={required}
	data-slot="checkbox"
	data-state={state}
	{disabled}
	onclick={toggle}
	class={cn(
		'group peer inline-flex size-touch shrink-0 items-center justify-center rounded-md outline-none',
		'disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	{...restProps}
>
	<span
		data-slot="checkbox-box"
		data-state={state}
		data-tone={tone}
		class={cn(
			checkboxBoxStates,
			checkboxTones[tone].box,
			hover && checkboxBoxHover,
			checkboxBoxSizes[size],
			checkboxTones[tone].corner,
			'group-focus-visible:border-ring group-focus-visible:ring-3 group-focus-visible:ring-ring/50',
			'group-aria-invalid:border-danger'
		)}
	>
		{#if indeterminate}
			<span
				aria-hidden="true"
				class={cn('font-bold', checkboxTones[tone].mark, checkboxMarkSizes[size])}>−</span
			>
		{:else if checked && checkboxTones[tone].tick}
			<Tick strokeWidth={3.4} class={cn('icon-check-mark', checkboxTones[tone].mark)} />
		{:else if checked}
			<span
				aria-hidden="true"
				class={cn('font-bold', checkboxTones[tone].mark, checkboxMarkSizes[size])}>✓</span
			>
		{/if}
	</span>
</button>

<!-- Mirror into a hidden control so the checkbox participates in native forms. -->
{#if name}
	<input
		type="checkbox"
		aria-hidden="true"
		tabindex={-1}
		class="sr-only"
		{name}
		{value}
		{checked}
		{required}
		{disabled}
	/>
{/if}
