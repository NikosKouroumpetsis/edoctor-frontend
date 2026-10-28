<script lang="ts" module>
	import type { FieldSize } from '$shared/ui/primitives/floating-label';

	/** The field family's sizes (`default | lg | xl`, 48 / 56 / 64), the application's `FieldSize`. */
	export type TextFieldSize = FieldSize;
</script>

<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { untrack, type Snippet } from 'svelte';
	import { cn } from '$shared/lib/utils';
	import { useId } from '$shared/lib/headless';
	import { FieldMessage } from '$shared/ui/primitives/field-message';
	import { FloatingLabel } from '$shared/ui/primitives/floating-label';
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
		helperText,
		invalid = false,
		required = false,
		disabled = false,
		onChangeText,
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
		/** The muted line under the field while there is no error. */
		helperText?: string;
		/** The error look without a message (the message lives elsewhere). */
		invalid?: boolean;
		required?: boolean;
		disabled?: boolean;
		/** The application's value callback: the new text, after `bind:value` / `field` took it. */
		onChangeText?: (value: string) => void;
		/** Extra classes merged onto the `<input>` itself (e.g. to join borders). */
		inputClass?: string;
		leading?: Snippet;
		trailing?: Snippet;
	} = $props();

	// Generated once; `id` is treated as a static prop on mount.
	const inputId = useId(untrack(() => id) ?? undefined, 'field');
	const messageId = `${inputId}-message`;

	const currentValue = $derived(field ? (field.value ?? '') : value);
	const currentError = $derived(field ? field.error : error);
	const hasError = $derived(Boolean(currentError) || invalid);
	const hasMessage = $derived(Boolean(currentError || helperText));

	// The placeholder is only shown while focused, so an empty, unfocused field shows just the resting label.
	let placeholderText = $state(' ');
	let focused = $state(false);
	// The application's `floated = focused || hasValue` (R3-3); an autofilled input floats it by CSS.
	const floated = $derived(focused || currentValue !== '');

	function handleInput(event: Event) {
		const next = (event.target as HTMLInputElement).value;
		if (field) field.setValue(next);
		else value = next;
		onChangeText?.(next);
		oninput?.(event as Event & { currentTarget: HTMLInputElement });
	}

	function handleFocus(event: FocusEvent) {
		focused = true;
		placeholderText = placeholder || ' ';
		onfocus?.(event as FocusEvent & { currentTarget: HTMLInputElement });
	}

	function handleBlur(event: FocusEvent) {
		focused = false;
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
			aria-invalid={hasError ? 'true' : undefined}
			aria-required={required || undefined}
			aria-describedby={hasMessage ? messageId : undefined}
			oninput={handleInput}
			onfocus={handleFocus}
			onblur={handleBlur}
			data-slot="text-field-input"
			class={cn(
				'peer block w-full appearance-none rounded-md border border-input bg-card pr-3 text-foreground transition-[color,box-shadow] outline-none',
				'placeholder:text-muted-foreground',
				'focus:border-ring',
				'disabled:cursor-not-allowed disabled:opacity-50',
				'aria-[invalid=true]:border-danger aria-[invalid=true]:bg-danger/10',
				fieldSizes[size].input,
				leading ? 'pl-field-inset' : fieldSizes[size].start,
				trailing && 'pr-touch',
				inputClass
			)}
			{...restProps}
		/>

		<!-- Floating label (U-06.8): rests inside the field; rises within the top padding (scaled) on focus/fill. -->
		<FloatingLabel
			for={inputId}
			data-slot="text-field-label"
			{label}
			{floated}
			{focused}
			error={hasError}
			leading={Boolean(leading)}
			{size}
		/>

		{#if trailing}
			<div class="absolute inset-y-0 right-0 flex flex-row items-center gap-touch-gap">
				{@render trailing()}
			</div>
		{/if}
	</div>

	<FieldMessage id={messageId} error={currentError} {helperText} />
</div>
