<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Badge } from '$shared/ui/primitives/badge';

	const { Story } = defineMeta({
		title: 'Primitives/Badge',
		component: Badge,
		tags: ['autodocs'],
		args: { variant: 'default', size: 'default' },
		argTypes: {
			variant: {
				control: 'select',
				options: ['default', 'secondary', 'destructive', 'success', 'warning', 'outline']
			},
			size: { control: 'select', options: ['sm', 'default', 'lg'] }
		}
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<Badge {...args}>Badge</Badge>
	{/snippet}
</Story>

<Story name="Variants">
	{#snippet template()}
		<div class="flex flex-wrap gap-2">
			<Badge>Default</Badge>
			<Badge variant="secondary">Secondary</Badge>
			<Badge variant="destructive">Destructive</Badge>
			<Badge variant="success">Success</Badge>
			<Badge variant="warning">Warning</Badge>
			<Badge variant="outline">Outline</Badge>
		</div>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template()}
		<div class="flex items-center gap-2">
			<Badge size="sm">Small</Badge>
			<Badge size="default">Default</Badge>
			<Badge size="lg">Large</Badge>
		</div>
	{/snippet}
</Story>

<Story name="As link">
	{#snippet template()}
		<Badge href="https://example.com">View profile</Badge>
	{/snippet}
</Story>
