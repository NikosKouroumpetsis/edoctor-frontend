<script lang="ts" module>
	import type { TextFieldSize } from '$shared/ui/molecules/text-field';

	// The inline variant owns the border itself (see below), so its input is border/background-less and
	// takes only the shared field geometry; `CODE_PAD` is the side padding of the dial-code column.
	const CODE_PAD: Record<TextFieldSize, string> = {
		default: 'px-2.5',
		lg: 'px-3.5',
		xl: 'px-4'
	};
</script>

<script lang="ts">
	import AlertIcon from '~icons/lucide/circle-alert';
	import { Select, SelectTrigger, SelectContent, SelectItem } from '$shared/ui/primitives/select';
	import { cn } from '$shared/lib/utils';
	import { useId } from '$shared/lib/headless';
	import { fieldSizes } from '$shared/ui/primitives/input';
	import type { FieldApi } from '$shared/lib/form';

	// Structured so the trigger can show only the dial code (e.g. "+30") while the
	// dropdown shows "code + country name" (e.g. "+30  Ελλάδα").
	const DIAL_CODES = [
		{ value: '+30', name: 'Ελλάδα' },
		{ value: '+357', name: 'Κύπρος' },
		{ value: '+44', name: 'United Kingdom' },
		{ value: '+49', name: 'Deutschland' },
		{ value: '+1', name: 'United States' }
	];

	let {
		label = 'Phone number',
		countryLabel = 'Country',
		value = $bindable(''),
		dialCode = $bindable('+30'),
		field,
		error,
		size = 'default',
		placeholder = '',
		disabled = false
	}: {
		label?: string;
		countryLabel?: string;
		value?: string;
		dialCode?: string;
		field?: FieldApi<string>;
		error?: string;
		size?: TextFieldSize;
		placeholder?: string;
		disabled?: boolean;
	} = $props();

	const inputId = useId(undefined, 'phone-inline');
	const errorId = `${inputId}-error`;

	const currentValue = $derived(field ? (field.value ?? '') : value);
	const currentError = $derived(field ? field.error : error);

	// Placeholder is shown only while focused (an empty, unfocused field shows just
	// the resting label); a non-empty space otherwise keeps `:placeholder-shown`
	// driving the floating label. 1:1 with the text-field family.
	let placeholderText = $state(' ');

	function handleInput(event: Event) {
		const next = (event.target as HTMLInputElement).value;
		if (field) field.setValue(next);
		else value = next;
	}

	function handleFocus() {
		placeholderText = placeholder || ' ';
	}

	function handleBlur() {
		placeholderText = ' ';
		field?.handleBlur();
	}
</script>

<!--
	Inline / serial layout: one control owns the focus-within / invalid states, so
	the whole control highlights as one unit. Its border is an overlay drawn on top,
	so it adds no height: the field stays 48 / 56 / 64 like the other field
	molecules. Inside: a muted country select on the LEFT (dial code only), a 1px
	divider, and the floating-label phone input on the RIGHT. The error sits
	OUTSIDE the box so it never stretches the select.
-->
<div class="w-full pb-1" data-slot="phone-field-inline">
	<div
		data-slot="phone-field-inline-control"
		class={cn(
			'group relative flex w-full items-stretch overflow-hidden rounded-md bg-card',
			currentError && 'bg-destructive/10',
			disabled && 'pointer-events-none opacity-50'
		)}
	>
		<!-- Country select: borderless except a right divider, muted, dial code only. -->
		<Select bind:value={dialCode} {disabled}>
			<SelectTrigger
				class={cn(
					'h-auto shrink-0 items-center justify-center gap-1 rounded-none border-transparent border-r-input bg-muted font-medium focus-visible:border-transparent focus-visible:border-r-input focus-visible:ring-0',
					CODE_PAD[size]
				)}
				aria-label={countryLabel}
			>
				<span class="truncate">{dialCode}</span>
			</SelectTrigger>
			<SelectContent>
				{#each DIAL_CODES as code (code.value)}
					<SelectItem value={code.value} label={code.value}>
						<span class="w-dial-code-w shrink-0 font-medium text-foreground">{code.value}</span>
						<span class="text-muted-foreground">{code.name}</span>
					</SelectItem>
				{/each}
			</SelectContent>
		</Select>

		<!-- Phone number input with floating label. -->
		<div class="relative flex-1">
			<input
				id={inputId}
				type="tel"
				inputmode="tel"
				autocomplete="tel"
				{disabled}
				value={currentValue}
				placeholder={placeholderText}
				aria-invalid={currentError ? 'true' : undefined}
				aria-describedby={currentError ? errorId : undefined}
				oninput={handleInput}
				onfocus={handleFocus}
				onblur={handleBlur}
				data-slot="phone-field-inline-input"
				class={cn(
					'peer block w-full appearance-none bg-transparent pr-3 text-foreground outline-none',
					'placeholder:text-muted-foreground',
					'disabled:cursor-not-allowed disabled:opacity-50',
					fieldSizes[size].input,
					fieldSizes[size].start
				)}
			/>

			<label
				for={inputId}
				data-slot="phone-field-inline-label"
				class={cn(
					'pointer-events-none absolute z-10 origin-left transform truncate pr-3 text-muted-foreground duration-200',
					'scale-75',
					'peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100',
					'peer-focus:scale-75 peer-focus:text-foreground',
					'peer-aria-[invalid=true]:text-destructive',
					fieldSizes[size].label,
					fieldSizes[size].left
				)}
			>
				{label}
			</label>
		</div>

		<span
			aria-hidden="true"
			data-slot="phone-field-inline-border"
			class={cn(
				'pointer-events-none absolute inset-0 rounded-md border transition-colors',
				currentError ? 'border-destructive' : 'border-input group-focus-within:border-ring'
			)}
		></span>
	</div>

	{#if currentError}
		<p
			id={errorId}
			data-slot="phone-field-inline-error"
			class="mt-1 flex items-center gap-1 text-body-sm text-destructive"
		>
			<AlertIcon class="size-4 shrink-0" />
			{currentError}
		</p>
	{/if}
</div>
