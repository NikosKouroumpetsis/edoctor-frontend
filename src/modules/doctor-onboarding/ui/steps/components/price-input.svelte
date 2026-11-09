<script lang="ts">
	import { DOCTOR_ONBOARDING_PRICE_DIGITS } from '$modules/doctor-onboarding/config';
	import { keepPriceInput } from '$modules/doctor-onboarding/lib/validation';

	let {
		currency,
		label,
		placeholder,
		hint,
		value,
		onInput
	}: {
		/** «€», before the amount (hidden from a screen reader: the field's name says «Τιμή σε ευρώ»). */
		currency: string;
		/** «Τιμή σε ευρώ»: the field's name. */
		label: string;
		placeholder: string;
		/** «Οι ασθενείς τη βλέπουν ως ενδεικτική τιμή.» */
		hint: string;
		/** The price as typed: digits only. */
		value: string;
		onInput: (value: string) => void;
	} = $props();

	const id = $props.id();

	/** The field shows only what it keeps (digits, four at most): a sign, a dot or a letter leaves nothing behind. */
	function keep(event: Event & { currentTarget: HTMLInputElement }) {
		const kept = keepPriceInput(event.currentTarget.value);
		if (kept !== event.currentTarget.value) event.currentTarget.value = kept;
		onInput(kept);
	}
</script>

<!-- 39 · the big «€ __» in the middle (record §6.4, 48/700, `doctor.css` `.d-price`): digits only on the number pad, the
     placeholder muted, as wide as what is typed; the line under it says patients read it as an indicative price.
     🔴 U-65.6: at most four digits, no sign, no decimal; shown back only as the field's own value. -->
<div data-slot="doctor-onboarding-price" class="flex flex-col items-center gap-2 pt-4 pb-6">
	<div class="flex min-h-touch flex-row items-baseline justify-center gap-1.5">
		<span aria-hidden="true" class="text-display-xl font-bold text-foreground">{currency}</span>
		<input
			{id}
			type="text"
			inputmode="numeric"
			autocomplete="off"
			aria-label={label}
			aria-describedby={`${id}-hint`}
			maxlength={DOCTOR_ONBOARDING_PRICE_DIGITS}
			size={Math.max(value.length, placeholder.length, 1)}
			{placeholder}
			{value}
			oninput={keep}
			data-testid="doctor-onboarding-price-amount"
			class="field-sizing-content min-h-touch min-w-touch rounded-md bg-transparent p-0 text-center text-display-xl font-bold text-foreground outline-none placeholder:text-border focus-visible:ring-3 focus-visible:ring-ring/50"
		/>
	</div>
	<p id={`${id}-hint`} class="text-center text-body-sm text-muted-foreground">{hint}</p>
</div>
