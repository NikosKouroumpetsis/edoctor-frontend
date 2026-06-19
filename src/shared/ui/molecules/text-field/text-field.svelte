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
		error,
		disabled = false,
		class: className,
		leading,
		trailing,
		oninput,
		onblur,
		...restProps
	}: Omit<HTMLInputAttributes, 'value'> & {
		label: string;
		value?: string;
		/** Connect to a `createForm` field; takes precedence over bind:value. */
		field?: FieldApi<string>;
		/** Standalone error message (ignored when `field` is provided). */
		error?: string;
		disabled?: boolean;
		leading?: Snippet;
		trailing?: Snippet;
	} = $props();

	// Generated once; `id` is treated as a static prop on mount.
	const inputId = useId(untrack(() => id) ?? undefined, 'field');
	const errorId = `${inputId}-error`;

	const currentValue = $derived(field ? (field.value ?? '') : value);
	const currentError = $derived(field ? field.error : error);

	function handleInput(event: Event) {
		const next = (event.target as HTMLInputElement).value;
		if (field) field.setValue(next);
		else value = next;
		oninput?.(event as Event & { currentTarget: HTMLInputElement });
	}

	function handleBlur(event: FocusEvent) {
		field?.handleBlur();
		onblur?.(event as FocusEvent & { currentTarget: HTMLInputElement });
	}
</script>

<div class={cn('w-full', className)} data-slot="text-field">
	<div class="relative">
		{#if leading}
			<div class="absolute inset-y-0 left-3 flex items-center text-muted-foreground">
				{@render leading()}
			</div>
		{/if}

		<input
			id={inputId}
			{type}
			{disabled}
			value={currentValue}
			placeholder=" "
			aria-invalid={currentError ? 'true' : undefined}
			aria-describedby={currentError ? errorId : undefined}
			oninput={handleInput}
			onblur={handleBlur}
			data-slot="text-field-input"
			class={cn(
				'peer h-14 w-full rounded-control border border-input bg-card px-3 pt-5 pb-1.5 text-base text-foreground transition-[color,box-shadow] outline-none',
				'placeholder:text-transparent focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
				'disabled:cursor-not-allowed disabled:opacity-50',
				'aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/20',
				leading && 'pl-9',
				trailing && 'pr-10'
			)}
			{...restProps}
		/>

		<!-- Floating label: sits inside the field when empty/unfocused, rises when focused or filled. -->
		<label
			for={inputId}
			data-slot="text-field-label"
			class={cn(
				'pointer-events-none absolute top-1/2 left-3 origin-[0] -translate-y-1/2 text-base text-muted-foreground transition-all duration-150',
				'-translate-y-4 scale-75 peer-placeholder-shown:translate-y-[-50%] peer-placeholder-shown:scale-100 peer-focus:-translate-y-4 peer-focus:scale-75',
				'peer-focus:text-foreground peer-aria-[invalid=true]:text-destructive',
				leading && 'left-9 peer-placeholder-shown:left-9 peer-focus:left-3'
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
