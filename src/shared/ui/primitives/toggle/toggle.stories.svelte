<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Toggle } from '$shared/ui/primitives/toggle';

	// The application's meta (`atoms/toggle`): its `label` is the web toggle's text child.
	const { Story } = defineMeta({
		title: 'Primitives/Toggle',
		component: Toggle,
		tags: ['autodocs'],
		args: { pressed: false, variant: 'default', size: 'md', disabled: false },
		argTypes: {
			variant: { control: 'inline-radio', options: ['default', 'outline'] },
			size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
			disabled: { control: 'boolean' }
		}
	});
</script>

<script lang="ts">
	let playground = $state(false);
	let outline = $state(false);
	const sized = $state<Record<string, boolean>>({ sm: false, md: false, lg: false });
</script>

<Story name="Playground">
	{#snippet template(args)}
		<Toggle {...args} bind:pressed={playground}>Έντονα</Toggle>
	{/snippet}
</Story>

<Story name="Outline" args={{ variant: 'outline' }}>
	{#snippet template(args)}
		<Toggle {...args} bind:pressed={outline}>Έντονα</Toggle>
	{/snippet}
</Story>

<Story name="Pressed" args={{ pressed: true }}>
	{#snippet template(args)}
		<Toggle {...args}>Έντονα</Toggle>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template(args)}
		<div class="flex flex-row items-center gap-3">
			{#each ['sm', 'md', 'lg'] as const as size (size)}
				<Toggle {...args} {size} bind:pressed={sized[size]}>{size}</Toggle>
			{/each}
		</div>
	{/snippet}
</Story>
