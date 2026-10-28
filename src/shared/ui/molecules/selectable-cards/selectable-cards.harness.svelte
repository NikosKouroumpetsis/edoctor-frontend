<script lang="ts">
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { SelectableCards } from './index';

	let {
		type = 'single',
		value = $bindable(),
		disabled = false,
		iconPlacement = 'trailing',
		onChange = () => {}
	}: {
		type?: 'single' | 'multiple';
		value?: string | string[];
		disabled?: boolean;
		iconPlacement?: 'leading' | 'trailing';
		onChange?: (value: string | string[] | undefined) => void;
	} = $props();
</script>

{#snippet star()}<Ionicon name="star-outline" class="icon-lg text-foreground" />{/snippet}

{#if type === 'multiple'}
	<SelectableCards
		type="multiple"
		bind:value
		{disabled}
		{iconPlacement}
		{onChange}
		label="Choose spaces"
		testId="spaces"
		options={[
			{ value: 'alpha', title: 'Alpha', description: 'First option', icon: star },
			{ value: 'beta', title: 'Beta', description: 'Second option' },
			{ value: 'gamma', title: 'Gamma' }
		]}
	/>
{:else}
	<SelectableCards
		bind:value
		{disabled}
		{iconPlacement}
		{onChange}
		label="Choose a space"
		testId="space"
		options={[
			{ value: 'alpha', title: 'Alpha', description: 'First option', icon: star },
			{ value: 'beta', title: 'Beta', description: 'Second option' },
			{ value: 'gamma', title: 'Gamma' }
		]}
	/>
{/if}
