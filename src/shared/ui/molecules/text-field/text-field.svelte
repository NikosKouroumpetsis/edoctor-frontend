<script lang="ts" module>
	import type { InputSize } from '$shared/ui/primitives/input';

	export type TextFieldSize = InputSize;

	/**
	 * 1:1 port of the old Vue floating-label input (components/Input/Text.vue):
	 * the label rests inside the field and rises *inside* the top padding when the
	 * field is focused or filled (it is NOT a notch on the border). `default`
	 * reproduces the Vue geometry exactly; the other sizes scale around it.
	 */
	const SIZES: Record<TextFieldSize, { input: string; label: string }> = {
		sm: {
			input: 'pl-2 pt-3 pb-1 text-xs',
			label: 'left-2 top-2.5 text-xs -translate-y-2.5 peer-focus:-translate-y-2.5'
		},
		default: {
			input: 'pl-2.5 pt-4 pb-1.5 text-sm',
			label: 'left-2.5 top-3 text-sm -translate-y-3 peer-focus:-translate-y-3'
		},
		lg: {
			input: 'pl-2.5 pt-5 pb-2.5 text-base',
			label: 'left-2.5 top-4 text-base -translate-y-4 peer-focus:-translate-y-4'
		},
		xl: {
			input: 'pl-3 pt-6 pb-3 text-lg',
			label: 'left-3 top-5 text-lg -translate-y-5 peer-focus:-translate-y-5'
		}
	};
</script>

<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { untrack, type Snippet } from 'svelte';
	import AlertIcon from '~icons/lucide/circle-alert';
	import { cn } from '$shared/lib/utils';
	import { useId } from '$shared/lib/headless';
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
				'peer block w-full appearance-none rounded-md border-[1.5px] border-input bg-card pr-3 text-foreground transition-[color,box-shadow] outline-none',
				'placeholder:text-muted-foreground',
				'focus:border-ring focus:ring-[0.5px] focus:ring-ring',
				'disabled:cursor-not-allowed disabled:opacity-50',
				'aria-[invalid=true]:border-destructive aria-[invalid=true]:bg-destructive/10',
				SIZES[size].input,
				leading && 'pl-9',
				trailing && 'pr-10',
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
				'pointer-events-none absolute z-10 origin-[0] transform truncate pr-3 text-muted-foreground duration-200',
				'scale-75',
				'peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100',
				'peer-focus:scale-75 peer-focus:text-foreground',
				'peer-aria-[invalid=true]:text-destructive',
				SIZES[size].label,
				leading && 'peer-placeholder-shown:left-9 peer-focus:left-2.5'
			)}
		>
			{label}
		</label>

		{#if trailing}
			<div class="absolute inset-y-0 right-2 flex items-center">
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
