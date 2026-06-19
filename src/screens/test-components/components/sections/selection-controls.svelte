<script lang="ts">
	import { Checkbox } from '$shared/ui/primitives/checkbox';
	import { Switch } from '$shared/ui/primitives/switch';
	import { RadioGroup, RadioGroupItem } from '$shared/ui/primitives/radio-group';
	import { Label } from '$shared/ui/primitives/label';
	import DemoSection from '../demo-section.svelte';
	import DemoRow from '../demo-row.svelte';

	let terms = $state(false);
	let notifications = $state(true);
	let plan = $state('pro');
</script>

<DemoSection
	id="selection-controls"
	title="Checkbox · Switch · Radio"
	description="Selection controls with full keyboard and ARIA support."
>
	<DemoRow label="Checkbox">
		<div class="flex items-center gap-2">
			<Checkbox id="terms" bind:checked={terms} />
			<Label for="terms">Accept terms ({terms ? 'yes' : 'no'})</Label>
		</div>
		<div class="flex items-center gap-2">
			<Checkbox id="indet" indeterminate />
			<Label for="indet">Indeterminate</Label>
		</div>
		<div class="flex items-center gap-2">
			<Checkbox id="cb-disabled" disabled />
			<Label for="cb-disabled">Disabled</Label>
		</div>
	</DemoRow>

	<DemoRow label="Switch">
		<div class="flex items-center gap-2">
			<Switch id="notif" bind:checked={notifications} />
			<Label for="notif">Notifications ({notifications ? 'on' : 'off'})</Label>
		</div>
		<div class="flex items-center gap-2">
			<Switch id="sw-disabled" disabled />
			<Label for="sw-disabled">Disabled</Label>
		</div>
	</DemoRow>

	<DemoRow label="Radio group (selected: {plan})">
		<RadioGroup bind:value={plan} name="plan" class="flex flex-col gap-3">
			<div class="flex items-center gap-2">
				<RadioGroupItem value="free" id="r-free" />
				<Label for="r-free">Free</Label>
			</div>
			<div class="flex items-center gap-2">
				<RadioGroupItem value="pro" id="r-pro" />
				<Label for="r-pro">Pro</Label>
			</div>
			<div class="flex items-center gap-2">
				<RadioGroupItem value="team" id="r-team" />
				<Label for="r-team">Team</Label>
			</div>
		</RadioGroup>
	</DemoRow>
</DemoSection>
