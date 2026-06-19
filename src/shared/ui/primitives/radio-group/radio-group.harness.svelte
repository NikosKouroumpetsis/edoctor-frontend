<script lang="ts">
	import { RadioGroup, RadioGroupItem } from './index';
	import { Label } from '$shared/ui/primitives/label';

	let { value = $bindable() }: { value?: string } = $props();
</script>

<RadioGroup bind:value name="plan">
	<div class="flex items-center gap-2">
		<RadioGroupItem value="free" id="free" />
		<Label for="free">Free</Label>
	</div>
	<div class="flex items-center gap-2">
		<RadioGroupItem value="pro" id="pro" />
		<Label for="pro">Pro</Label>
	</div>
	<div class="flex items-center gap-2">
		<RadioGroupItem value="team" id="team" />
		<Label for="team">Team</Label>
	</div>
</RadioGroup>
