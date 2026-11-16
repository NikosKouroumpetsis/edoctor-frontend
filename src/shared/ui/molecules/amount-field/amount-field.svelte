<script lang="ts">
	import { cn } from '$shared/lib/utils';

	let {
		value,
		onInput,
		label,
		symbol,
		error = null,
		maxLength,
		describedby,
		testId
	}: {
		/** The amount as typed (the caller reads it: a comma or a dot, its decimals). */
		value: string;
		/** Every keystroke, the field's whole text. */
		onInput: (value: string) => void;
		/** The field's name, already localized («Τελική τιμή σε ευρώ»). */
		label: string;
		/** The currency's sign before the amount, already localized («€»). */
		symbol: string;
		/** What is wrong with it, said under it (the field turns red); `null` for nothing. */
		error?: string | null;
		/** How many characters it takes at most. */
		maxLength: number;
		/** The id of the words that explain it (a line above it). */
		describedby?: string;
		testId?: string;
	} = $props();

	const errorId = $props.id();
</script>

<!-- `64-switch/sw.css:215-217` (`.w-eur`, shared since D-W51-52): an amount with its sign — 56 high, 20/600, the 12 corner,
     about 220 wide (three fifths of a phone's column, two fifths of the 560 one); the numbers' keyboard; the border
     darkens while typing (the form controls' border focus, no ring of colour). What is wrong is said under it, never
     a colour alone. Every word a text node (U-65.6). -->
<div data-slot="amount-field" data-testid={testId}>
	<label
		data-invalid={error ? '' : undefined}
		class={cn(
			'flex min-h-control-lg w-3/5 flex-row items-center gap-2 rounded-md border border-input bg-card px-3.5 text-title-lg font-semibold text-foreground tablet:w-2/5',
			'focus-within:border-foreground focus-within:ring-1 focus-within:ring-foreground focus-within:ring-inset',
			error && 'border-danger-text focus-within:border-danger-text focus-within:ring-danger-text'
		)}
	>
		<span aria-hidden="true">{symbol}</span>
		<input
			type="text"
			inputmode="decimal"
			autocomplete="off"
			spellcheck="false"
			aria-label={label}
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={[describedby, error ? errorId : undefined].filter(Boolean).join(' ') ||
				undefined}
			maxlength={maxLength}
			{value}
			oninput={(event) => onInput(event.currentTarget.value)}
			class="min-h-touch min-w-touch flex-1 border-0 bg-transparent p-0 text-inherit outline-none"
		/>
	</label>
	{#if error}
		<p id={errorId} role="alert" class="mt-2 text-label-lg font-medium text-danger-text">
			{error}
		</p>
	{/if}
</div>
