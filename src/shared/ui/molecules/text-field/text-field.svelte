<script lang="ts" module>
	import type { InputSize } from '$shared/ui/primitives/input';

	export type TextFieldSize = InputSize;
</script>

<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { untrack, type Snippet } from 'svelte';
	import AlertIcon from '~icons/lucide/circle-alert';
	import { cn } from '$shared/lib/utils';
	import { useId } from '$shared/lib/headless';
	import { fieldSizes } from '$shared/ui/primitives/input';
	import type { FieldApi } from '$shared/lib/form';

	let {
		label,
		value = $bindable(''),
		field,
		id,
		type = 'text',
		size = 'default',
		error,
		disabled = false,
		class: className,
		inputClass,
		placeholder = '',
		leading,
		trailing,
		oninput,
		onblur,
		onfocus,
		...restProps
	}: Omit<HTMLInputAttributes, 'value' | 'size'> & {
		label: string;
		value?: string;
		/** Connect to a `createForm` field; takes precedence over bind:value. */
		field?: FieldApi<string>;
		size?: TextFieldSize;
		/** Standalone error message (ignored when `field` is provided). */
		error?: string;
		disabled?: boolean;
		/** Extra classes merged onto the `<input>` itself (e.g. to join borders). */
		inputClass?: string;
		leading?: Snippet;
		trailing?: Snippet;
	} = $props();

	// Generated once; `id` is treated as a static prop on mount.
	const inputId = useId(untrack(() => id) ?? undefined, 'field');
	const errorId = `${inputId}-error`;

	const currentValue = $derived(field ? (field.value ?? '') : value);
	const currentError = $derived(field ? field.error : error);

	// The placeholder is only shown while focused (so an empty, unfocused field
	// shows just the resting label). It is a non-empty space otherwise so the
	// floating-label `:placeholder-shown` mechanism keeps working. (1:1 with Vue.)
	let placeholderText = $state(' ');

	function handleInput(event: Event) {
		const next = (event.target as HTMLInputElement).value;
		if (field) field.setValue(next);
		else value = next;
		oninput?.(event as Event & { currentTarget: HTMLInputElement });
	}

	function handleFocus(event: FocusEvent) {
		placeholderText = placeholder || ' ';
		onfocus?.(event as FocusEvent & { currentTarget: HTMLInputElement });
	}

	function handleBlur(event: FocusEvent) {
		placeholderText = ' ';
		field?.handleBlur();
		onblur?.(event as FocusEvent & { currentTarget: HTMLInputElement });
	}
</script>

<div class={cn('relative w-full pb-1', className)} data-slot="text-field">
	<div class="relative">
		{#if leading}
			<div
				class="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-muted-foreground"
			>
				{@render leading()}
			</div>
		{/if}

		<input
			id={inputId}
			{type}
			{disabled}
			value={currentValue}
			placeholder={placeholderText}
			aria-invalid={currentError ? 'true' : undefined}
			aria-describedby={currentError ? errorId : undefined}
			oninput={handleInput}
			onfocus={handleFocus}
			onblur={handleBlur}
			data-slot="text-field-input"
			class={cn(
				'peer block w-full appearance-none rounded-md border border-input bg-card pr-3 text-foreground transition-[color,box-shadow] outline-none',
				'placeholder:text-muted-foreground',
				'focus:border-ring',
				'disabled:cursor-not-allowed disabled:opacity-50',
				'aria-[invalid=true]:border-destructive aria-[invalid=true]:bg-destructive/10',
				fieldSizes[size].input,
				leading ? 'pl-field-inset' : fieldSizes[size].start,
				trailing && 'pr-touch',
				inputClass
			)}
			{...restProps}
		/>

		<!-- Floating label: rests inside the field; rises within the top padding
		     (scaled) on focus/fill — matches the old Vue input exactly. -->
		<label
			for={inputId}
			data-slot="text-field-label"
			class={cn(
				'pointer-events-none absolute z-10 origin-left transform truncate pr-3 text-muted-foreground duration-200',
				'scale-75',
				'peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100',
				'peer-focus:scale-75 peer-focus:text-foreground',
				'peer-aria-[invalid=true]:text-destructive',
				fieldSizes[size].label,
				fieldSizes[size].left,
				leading && 'peer-placeholder-shown:left-field-inset peer-focus:left-2.5'
			)}
		>
			{label}
		</label>

		{#if trailing}
			<div class="absolute inset-y-0 right-0 flex items-center">
				{@render trailing()}
			</div>
		{/if}
	</div>

	{#if currentError}
		<p
			id={errorId}
			data-slot="text-field-error"
			class="mt-1 flex items-center gap-1 text-body-sm text-destructive"
		>
			<AlertIcon class="size-4 shrink-0" />
			{currentError}
		</p>
	{/if}
</div>
