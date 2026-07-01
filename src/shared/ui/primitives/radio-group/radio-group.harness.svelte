<script lang="ts">
	import { RadioGroup, RadioGroupItem, type RadioGroupItemSize } from './index';
	import { Label } from '$shared/ui/primitives/label';

	let { value = $bindable(), size = 'default' }: { value?: string; size?: RadioGroupItemSize } =
		$props();
</script>

<RadioGroup bind:value name="plan">
	<div class="flex items-center gap-2">
		<RadioGroupItem value="free" id="free" {size} />
		<Label for="free">Free</Label>
	</div>
	<div class="flex items-center gap-2">
		<RadioGroupItem value="pro" id="pro" {size} />
		<Label for="pro">Pro</Label>
	</div>
	<div class="flex items-center gap-2">
		<RadioGroupItem value="team" id="team" {size} />
		<Label for="team">Team</Label>
	</div>
</RadioGroup>
