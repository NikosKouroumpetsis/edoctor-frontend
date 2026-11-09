<script lang="ts">
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { SelectableCards } from './index';

	let {
		type = 'single',
		value = $bindable(),
		disabled = false,
		iconPlacement = 'trailing',
		size,
		hover,
		withDetails = false,
		onChange = () => {}
	}: {
		type?: 'single' | 'multiple';
		value?: string | string[];
		disabled?: boolean;
		iconPlacement?: 'leading' | 'trailing';
		size?: 'md' | 'sm';
		hover?: boolean;
		/** Alpha opens a detail of its own under it while chosen (a checkbox the caller draws). */
		withDetails?: boolean;
		onChange?: (value: string | string[] | undefined) => void;
	} = $props();

	let extra = $state(false);
</script>

{#snippet star()}<Ionicon name="star-outline" class="icon-lg text-foreground" />{/snippet}
{#snippet alphaDetails()}
	<button
		type="button"
		role="checkbox"
		aria-checked={extra}
		data-testid="alpha-extra"
		class="min-h-touch w-full"
		onclick={() => (extra = !extra)}>Extra</button
	>
{/snippet}

{#if type === 'multiple'}
	<SelectableCards
		type="multiple"
		bind:value
		{disabled}
		{iconPlacement}
		{hover}
		{onChange}
		label="Choose spaces"
		testId="spaces"
		options={[
			{
				value: 'alpha',
				title: 'Alpha',
				description: 'First option',
				icon: star,
				details: withDetails ? alphaDetails : undefined
			},
			{ value: 'beta', title: 'Beta', description: 'Second option' },
			{ value: 'gamma', title: 'Gamma' }
		]}
	/>
{:else}
	<SelectableCards
		bind:value
		{disabled}
		{iconPlacement}
		{size}
		{hover}
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
