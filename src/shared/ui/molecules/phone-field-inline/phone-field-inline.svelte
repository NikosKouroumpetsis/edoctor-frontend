<script lang="ts" module>
	import type { TextFieldSize } from '$shared/ui/molecules/text-field';

	// Floating-label geometry per size — kept 1:1 with the text-field family so the
	// inline number input reads identically to the rest of the field molecules. The
	// inline variant owns the border itself (see below), so the input here is
	// intentionally border/background-less; only the padding + label transforms are
	// shared. The select column stretches to this height and centers its content.
	const SIZES: Record<TextFieldSize, { input: string; label: string; code: string }> = {
		sm: {
			input: 'pl-2.5 pt-4 pb-1.5 text-sm',
			label: 'left-2.5 top-3 text-sm -translate-y-3 peer-focus:-translate-y-3',
			code: 'px-2.5 text-sm'
		},
		default: {
			input: 'pl-2.5 pt-5 pb-2.5 text-base',
			label: 'left-2.5 top-4 text-base -translate-y-4 peer-focus:-translate-y-4',
			code: 'px-3.5 text-base'
		},
		lg: {
			input: 'pl-3 pt-6 pb-3 text-lg',
			label: 'left-3 top-5 text-lg -translate-y-5 peer-focus:-translate-y-5',
			code: 'px-4 text-lg'
		},
		xl: {
			input: 'pl-3.5 pt-7 pb-3.5 text-xl',
			label: 'left-3.5 top-6 text-xl -translate-y-6 peer-focus:-translate-y-6',
			code: 'px-4 text-xl'
		}
	};
</script>

<script lang="ts">
	import AlertIcon from '~icons/lucide/circle-alert';
	import { Select, SelectTrigger, SelectContent, SelectItem } from '$shared/ui/primitives/select';
	import { cn } from '$shared/lib/utils';
	import { useId } from '$shared/lib/headless';
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
	Inline / serial layout: a single bordered control owns the border and the
	focus-within / invalid states, so the whole control highlights as one unit
	(matching the other field molecules). Inside it: a muted country select on the
	LEFT showing only the dial code (vertically centered via `items-stretch`), a
	1.5px divider, and the floating-label phone input on the RIGHT. The error sits
	OUTSIDE the bordered box so it never stretches the select.
-->
<div class="w-full pb-1" data-slot="phone-field-inline">
	<div
		class={cn(
			'flex w-full items-stretch overflow-hidden rounded-md border-[1.5px] bg-card transition-[color,box-shadow]',
			currentError
				? 'border-destructive bg-destructive/10'
				: 'border-input focus-within:border-ring focus-within:ring-[0.5px] focus-within:ring-ring',
			disabled && 'pointer-events-none opacity-50'
		)}
	>
		<!-- Country select: borderless except a right divider, muted, dial code only. -->
		<Select bind:value={dialCode} {disabled}>
			<SelectTrigger
				size={size === 'sm' ? 'sm' : 'default'}
				class={cn(
					'h-auto shrink-0 items-center justify-center gap-1 rounded-none border-transparent border-r-input bg-muted font-medium focus-visible:border-transparent focus-visible:border-r-input focus-visible:ring-0',
					SIZES[size].code
				)}
				aria-label={countryLabel}
			>
				<span class="truncate">{dialCode}</span>
			</SelectTrigger>
			<SelectContent>
				{#each DIAL_CODES as code (code.value)}
					<SelectItem value={code.value} label={code.value}>
						<span class="w-14 shrink-0 font-medium text-foreground">{code.value}</span>
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
					SIZES[size].input
				)}
			/>

			<label
				for={inputId}
				data-slot="phone-field-inline-label"
				class={cn(
					'pointer-events-none absolute z-10 origin-[0] transform truncate pr-3 text-muted-foreground duration-200',
					'scale-75',
					'peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100',
					'peer-focus:scale-75 peer-focus:text-foreground',
					'peer-aria-[invalid=true]:text-destructive',
					SIZES[size].label
				)}
			>
				{label}
			</label>
		</div>
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
