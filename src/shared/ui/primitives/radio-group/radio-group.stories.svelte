<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { RadioGroup, RadioGroupItem } from '$shared/ui/primitives/radio-group';
	import { Label } from '$shared/ui/primitives/label';

	const { Story } = defineMeta({
		title: 'Primitives/Radio group',
		component: RadioGroup,
		tags: ['autodocs']
	});
</script>

<script lang="ts">
	let plan = $state('');
	let preselected = $state('pro');
	let horizontal = $state('email');
	let sized = $state('default');
</script>

<Story name="Default">
	{#snippet template()}
		<RadioGroup bind:value={plan} name="plan-default">
			<div class="flex items-center gap-2">
				<RadioGroupItem value="free" id="d-free" /><Label for="d-free">Free</Label>
			</div>
			<div class="flex items-center gap-2">
				<RadioGroupItem value="pro" id="d-pro" /><Label for="d-pro">Pro</Label>
			</div>
			<div class="flex items-center gap-2">
				<RadioGroupItem value="team" id="d-team" /><Label for="d-team">Team</Label>
			</div>
		</RadioGroup>
	{/snippet}
</Story>

<Story name="Pre-selected">
	{#snippet template()}
		<RadioGroup bind:value={preselected} name="plan-pre">
			<div class="flex items-center gap-2">
				<RadioGroupItem value="free" id="p-free" /><Label for="p-free">Free</Label>
			</div>
			<div class="flex items-center gap-2">
				<RadioGroupItem value="pro" id="p-pro" /><Label for="p-pro">Pro</Label>
			</div>
		</RadioGroup>
	{/snippet}
</Story>

<Story name="Disabled item">
	{#snippet template()}
		<RadioGroup value="free" name="plan-disabled">
			<div class="flex items-center gap-2">
				<RadioGroupItem value="free" id="x-free" /><Label for="x-free">Free</Label>
			</div>
			<div class="flex items-center gap-2 opacity-50">
				<RadioGroupItem value="team" id="x-team" disabled /><Label for="x-team">Team (soon)</Label>
			</div>
		</RadioGroup>
	{/snippet}
</Story>

<Story name="Horizontal">
	{#snippet template()}
		<RadioGroup bind:value={horizontal} name="contact" orientation="horizontal" class="flex gap-6">
			<div class="flex items-center gap-2">
				<RadioGroupItem value="email" id="h-email" /><Label for="h-email">Email</Label>
			</div>
			<div class="flex items-center gap-2">
				<RadioGroupItem value="sms" id="h-sms" /><Label for="h-sms">SMS</Label>
			</div>
		</RadioGroup>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template()}
		<RadioGroup bind:value={sized} name="plan-sizes">
			<div class="flex items-center gap-2">
				<RadioGroupItem value="sm" id="s-sm" size="sm" /><Label for="s-sm">Small</Label>
			</div>
			<div class="flex items-center gap-2">
				<RadioGroupItem value="default" id="s-default" size="default" /><Label for="s-default">
					Default
				</Label>
			</div>
			<div class="flex items-center gap-2">
				<RadioGroupItem value="lg" id="s-lg" size="lg" /><Label for="s-lg">Large</Label>
			</div>
		</RadioGroup>
	{/snippet}
</Story>
