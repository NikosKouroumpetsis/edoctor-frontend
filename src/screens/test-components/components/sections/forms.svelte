<script lang="ts">
	import { createForm, Validators } from '$shared/lib/form';
	import { Button } from '$shared/ui/primitives/button';
	import { TextField } from '$shared/ui/molecules/text-field';
	import { PasswordField } from '$shared/ui/molecules/password-field';
	import { NumberField } from '$shared/ui/molecules/number-field';
	import { Stepper } from '$shared/ui/molecules/stepper';
	import { PhoneField } from '$shared/ui/molecules/phone-field';
	import { DateOfBirthField } from '$shared/ui/molecules/date-of-birth-field';
	import { SingleSelection } from '$shared/ui/molecules/single-selection';
	import { MultiSelection } from '$shared/ui/molecules/multi-selection';
	import DemoSection from '../demo-section.svelte';
	import DemoRow from '../demo-row.svelte';

	type RegistrationForm = {
		fullName: string;
		email: string;
		password: string;
		age: string;
		minNotice: string;
		phone: string;
		dob: string;
		slot: string;
		languages: string[];
	};

	let submitted = $state<RegistrationForm | null>(null);

	const form = createForm<RegistrationForm>({
		initialValues: {
			fullName: '',
			email: '',
			password: '',
			age: '',
			minNotice: '2',
			phone: '',
			dob: '',
			slot: '',
			languages: []
		},
		validators: {
			fullName: [Validators.required, Validators.minLength(2)],
			email: [Validators.required, Validators.email],
			password: [Validators.required, Validators.minLength(8), Validators.passwordStrength],
			minNotice: [Validators.required, Validators.min(0), Validators.max(72)],
			slot: [Validators.required],
			languages: [Validators.required]
		},
		messages: {
			password: { minLength: 'At least 8 characters' }
		},
		onSubmit: (values) => {
			submitted = { ...values };
			// Data is also surfaced to the console for inspection.
			console.info('[forms demo] submitted', values);
		}
	});
</script>

<DemoSection
	id="forms"
	title="Form system & fields"
	description="In-house createForm (react-hook-form style) + floating-label fields. Submit to validate; values appear below and in the console."
>
	<form class="grid max-w-form gap-5" onsubmit={(e) => form.handleSubmit(e)} novalidate>
		<TextField label="Full name" field={form.field('fullName')} autocomplete="name" />
		<TextField label="Email" field={form.field('email')} type="email" autocomplete="email" />
		<PasswordField field={form.field('password')} autocomplete="new-password" />
		<NumberField label="Age" field={form.field('age')} min={0} max={120} />
		<Stepper
			label="Minimum notice (hours)"
			helperText="How many hours before an hour booking stops (0-72)."
			field={form.field('minNotice')}
			min={0}
			max={72}
		/>
		<PhoneField field={form.field('phone')} />
		<DateOfBirthField field={form.field('dob')} />

		<SingleSelection
			label="Preferred slot"
			field={form.field('slot')}
			options={[
				{ value: 'morning', label: 'Morning' },
				{ value: 'afternoon', label: 'Afternoon' },
				{ value: 'evening', label: 'Evening' }
			]}
		/>

		<MultiSelection
			label="Spoken languages"
			field={form.field('languages')}
			options={[
				{ value: 'gr', label: 'Greek' },
				{ value: 'en', label: 'English' },
				{ value: 'de', label: 'German' },
				{ value: 'fr', label: 'French' }
			]}
		/>

		<DemoRow label="Form state">
			<span class="text-body-sm text-muted-foreground">
				dirty: {form.isDirty} · submitted: {form.submitCount} ·
				{form.isSubmitting ? 'submitting…' : 'idle'}
			</span>
		</DemoRow>

		<div class="flex gap-3">
			<Button type="submit">Create account</Button>
			<Button type="button" variant="outline" onclick={() => form.reset()}>Reset</Button>
		</div>
	</form>

	{#if submitted}
		<pre
			data-testid="forms-result"
			class="overflow-x-auto rounded-md border border-border bg-muted p-4 text-body-sm">{JSON.stringify(
				submitted,
				null,
				2
			)}</pre>
	{/if}
</DemoSection>
