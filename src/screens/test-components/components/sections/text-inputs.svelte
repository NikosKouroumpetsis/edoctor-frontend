<script lang="ts">
	import { Input } from '$shared/ui/primitives/input';
	import { Label } from '$shared/ui/primitives/label';
	import DemoSection from '../demo-section.svelte';
	import DemoRow from '../demo-row.svelte';

	let value = $state('');
</script>

<DemoSection
	id="text-inputs"
	title="Input + Label"
	description="In-house text input and label primitives bound to local state."
>
	<DemoRow label="Default">
		<div class="grid w-full max-w-sm gap-2">
			<Label for="demo-email">Email</Label>
			<Input id="demo-email" type="email" placeholder="name@edoctor.gr" bind:value />
			<p class="text-body-sm text-muted-foreground">Value: {value || '—'}</p>
		</div>
	</DemoRow>

	<DemoRow label="States">
		<Input class="max-w-3xs" placeholder="Disabled" disabled />
		<Input class="max-w-3xs" placeholder="Invalid" aria-invalid="true" />
	</DemoRow>
</DemoSection>
