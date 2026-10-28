<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Button } from '$shared/ui/primitives/button';

	const { Story } = defineMeta({
		title: 'Showcases/Registration form',
		component: Button,
		tags: ['autodocs']
	});
</script>

<script lang="ts">
	import { createForm, Validators } from '$shared/lib/form';
	import { TextField } from '$shared/ui/molecules/text-field';
	import { PasswordField } from '$shared/ui/molecules/password-field';
	import { Stepper } from '$shared/ui/molecules/stepper';
	import { PhoneField } from '$shared/ui/molecules/phone-field';
	import { PhoneFieldInline } from '$shared/ui/molecules/phone-field-inline';
	import { DateOfBirthField } from '$shared/ui/molecules/date-of-birth-field';
	import { SingleSelection } from '$shared/ui/molecules/single-selection';
	import { MultiSelection } from '$shared/ui/molecules/multi-selection';

	type RegistrationForm = {
		fullName: string;
		email: string;
		password: string;
		minNotice: string;
		phone: string;
		mobile: string;
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
			minNotice: '2',
			phone: '',
			mobile: '',
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
			fullName: { required: 'Υποχρεωτικό πεδίο', minLength: 'Τουλάχιστον 2 χαρακτήρες.' },
			email: { required: 'Υποχρεωτικό πεδίο', email: 'Δώσε ένα έγκυρο email.' },
			password: { required: 'Υποχρεωτικό πεδίο', minLength: 'Τουλάχιστον 8 χαρακτήρες.' },
			slot: { required: 'Επιλέξτε μία ώρα' },
			languages: { required: 'Επιλέξτε τουλάχιστον μία γλώσσα' }
		},
		onSubmit: (values) => {
			submitted = { ...values };
		}
	});
</script>

<!--
	Component-level analogue of the /test-components Forms section: the full
	registration form built from createForm + every field molecule. Submit to
	validate; collected values render below.
-->
<Story name="Registration Form">
	{#snippet template()}
		<form class="grid max-w-form gap-5" onsubmit={(e) => form.handleSubmit(e)} novalidate>
			<TextField label="Ονοματεπώνυμο" field={form.field('fullName')} autocomplete="name" />
			<TextField label="Email" field={form.field('email')} type="email" autocomplete="email" />
			<PasswordField
				label="Κωδικός πρόσβασης"
				hideLabel="Απόκρυψη κωδικού"
				showLabel="Εμφάνιση κωδικού"
				field={form.field('password')}
				autocomplete="new-password"
			/>
			<Stepper
				label="Ελάχιστος χρόνος πριν την κράτηση (ώρες)"
				helperText="Πόσες ώρες πριν σταματά η κράτηση για μια ώρα (0-72)."
				decreaseLabel="Μείωση"
				increaseLabel="Αύξηση"
				emptyValueLabel="Κενό"
				field={form.field('minNotice')}
				min={0}
				max={72}
			/>
			<PhoneField
				label="Κινητό τηλέφωνο"
				countryLabel="Χώρα"
				countryAccessibilityLabel="Κωδικός χώρας"
				searchPlaceholder="Αναζήτηση χώρας"
				field={form.field('phone')}
			/>
			<PhoneFieldInline
				label="Αριθμός τηλεφώνου"
				countryAccessibilityLabel="Κωδικός χώρας"
				searchPlaceholder="Αναζήτηση χώρας"
				field={form.field('mobile')}
			/>
			<DateOfBirthField field={form.field('dob')} />

			<SingleSelection
				label="Προτιμώμενη ώρα"
				field={form.field('slot')}
				options={[
					{ value: 'morning', label: 'Πρωί' },
					{ value: 'noon', label: 'Μεσημέρι' },
					{ value: 'afternoon', label: 'Απόγευμα' }
				]}
			/>

			<MultiSelection
				label="Γλώσσες"
				field={form.field('languages')}
				options={[
					{ value: 'gr', label: 'Ελληνικά' },
					{ value: 'en', label: 'Αγγλικά' },
					{ value: 'de', label: 'Γερμανικά' },
					{ value: 'fr', label: 'Γαλλικά' }
				]}
			/>

			<p class="text-body-sm text-muted-foreground">
				Αλλαγές: {form.isDirty ? 'ναι' : 'όχι'} · Υποβολές: {form.submitCount} ·
				{form.isSubmitting ? 'Υποβολή…' : 'Σε αναμονή'}
			</p>

			<div class="flex flex-wrap gap-3">
				<Button type="submit" label="Δημιουργία λογαριασμού" />
				<Button tone="outline" label="Επαναφορά" onclick={() => form.reset()} />
			</div>
		</form>

		{#if submitted}
			<pre
				class="mt-4 scrollbar-none overflow-x-auto rounded-md border border-border bg-muted p-4 text-body-sm">{JSON.stringify(
					submitted,
					null,
					2
				)}</pre>
		{/if}
	{/snippet}
</Story>
