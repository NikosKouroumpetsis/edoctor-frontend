<script lang="ts">
	import { TextField } from './index';
	import { createForm, Validators } from '$shared/lib/form';

	let {
		onRenderEmail,
		onRenderName
	}: {
		onRenderEmail?: () => void;
		onRenderName?: () => void;
	} = $props();

	const form = createForm({
		initialValues: { email: '', name: '' },
		validators: { email: [Validators.required, Validators.email] }
	});

	const email = form.field('email');
	const name = form.field('name');

	// Per-field render probes: each effect only depends on its own field value,
	// so a write to one field must not trigger the other's probe.
	$effect(() => {
		void email.value;
		onRenderEmail?.();
	});
	$effect(() => {
		void name.value;
		onRenderName?.();
	});
</script>

<form>
	<TextField label="Email" field={email} type="email" />
	<TextField label="Name" field={name} />
</form>
