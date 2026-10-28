<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Badge } from '$shared/ui/primitives/badge';

	const tones = [
		'primary',
		'secondary',
		'accent',
		'muted',
		'success',
		'warning',
		'danger',
		'outline'
	] as const;
	const statusTones = ['success', 'warning', 'danger'] as const;
	const sizes = ['sm', 'md'] as const;

	// The application's meta (`atoms/badge`).
	const { Story } = defineMeta({
		title: 'Primitives/Badge',
		component: Badge,
		tags: ['autodocs'],
		args: { label: 'Διαθέσιμο', tone: 'primary', size: 'md', solid: false },
		argTypes: {
			tone: { control: 'select', options: tones },
			size: { control: 'radio', options: sizes },
			solid: { control: 'boolean' },
			label: { control: 'text' }
		}
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<Badge {...args} />
	{/snippet}
</Story>

<Story name="Tones">
	{#snippet template(args)}
		<div class="flex flex-row flex-wrap gap-2">
			{#each tones as tone (tone)}
				<Badge {...args} {tone} label={tone} />
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template(args)}
		<div class="flex flex-row items-center gap-2">
			{#each sizes as size (size)}
				<Badge {...args} {size} label={size} />
			{/each}
		</div>
	{/snippet}
</Story>

<!-- The opt-in solid status fills; the other tones ignore `solid`. -->
<Story name="Solid" args={{ solid: true }}>
	{#snippet template(args)}
		<div class="flex flex-row flex-wrap gap-2">
			{#each statusTones as tone (tone)}
				<Badge {...args} {tone} label={tone} />
			{/each}
		</div>
	{/snippet}
</Story>
