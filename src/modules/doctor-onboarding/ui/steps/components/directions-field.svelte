<script lang="ts">
	import { Textarea } from '$shared/ui/primitives/textarea';
	import { DOCTOR_ONBOARDING_GETTING_THERE_MAX_LENGTH } from '$modules/doctor-onboarding/config';
	import { readGettingThere } from '$modules/doctor-onboarding/lib/validation';

	let {
		label,
		placeholder,
		value,
		counter,
		onInput
	}: {
		/** «Οδηγίες για να σας βρουν (προαιρετικό)». */
		label: string;
		placeholder: string;
		value: string;
		/** «49/1000». */
		counter: string;
		onInput: (value: string) => void;
	} = $props();

	const id = $props.id();

	/** The box shows only what is kept: a paste past 1000 is cut in the box too, never only in the memory. */
	function keep(event: Event & { currentTarget: HTMLTextAreaElement }) {
		const kept = readGettingThere(event.currentTarget.value);
		if (kept !== event.currentTarget.value) event.currentTarget.value = kept;
		onInput(kept);
	}
</script>

<!-- 38 · «Οδηγίες για να σας βρουν» (record §6.8, U-68.2): the optional directions under their name, «49/1000» under them.
     🔴 U-65.6: the field stops at 1000 and the page cuts a paste past it (`readGettingThere`), so the count never
     disagrees with what is sent; the words come back only as a text node. -->
<div data-slot="doctor-onboarding-directions" class="flex flex-col gap-1.5">
	<label for={id} class="text-label-lg font-medium text-foreground">{label}</label>
	<Textarea
		{id}
		{value}
		{placeholder}
		size="lg"
		maxlength={DOCTOR_ONBOARDING_GETTING_THERE_MAX_LENGTH}
		aria-describedby={`${id}-counter`}
		oninput={keep}
		data-testid="doctor-onboarding-getting-there"
	/>
	<p
		id={`${id}-counter`}
		class="text-end text-label-md text-muted-foreground"
		data-testid="doctor-onboarding-getting-there-counter"
	>
		{counter}
	</p>
</div>
