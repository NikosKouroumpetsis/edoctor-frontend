<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Button } from '$shared/ui/primitives/button';
	import PlusIcon from '~icons/lucide/plus';
	import ArrowRightIcon from '~icons/lucide/arrow-right';

	const { Story } = defineMeta({
		title: 'Primitives/Button',
		component: Button,
		tags: ['autodocs'],
		args: { variant: 'default', size: 'default', disabled: false },
		argTypes: {
			variant: {
				control: 'select',
				options: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link']
			},
			size: {
				control: 'select',
				options: ['default', 'sm', 'lg', 'icon', 'icon-sm', 'icon-lg']
			},
			disabled: { control: 'boolean' }
		}
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<Button {...args}>Button</Button>
	{/snippet}
</Story>

<Story name="Variants">
	{#snippet template()}
		<div class="flex flex-wrap gap-3">
			<Button>Default</Button>
			<Button variant="secondary">Secondary</Button>
			<Button variant="destructive">Destructive</Button>
			<Button variant="outline">Outline</Button>
			<Button variant="ghost">Ghost</Button>
			<Button variant="link">Link</Button>
		</div>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template()}
		<div class="flex flex-wrap items-center gap-3">
			<Button size="sm">Small</Button>
			<Button size="default">Default</Button>
			<Button size="lg">Large</Button>
			<Button size="icon" aria-label="Add"><PlusIcon /></Button>
		</div>
	{/snippet}
</Story>

<Story name="With icon">
	{#snippet template()}
		<div class="flex flex-wrap gap-3">
			<Button><PlusIcon />Add item</Button>
			<Button variant="outline">Continue<ArrowRightIcon /></Button>
		</div>
	{/snippet}
</Story>

<Story name="As link">
	{#snippet template()}
		<Button href="https://example.com" variant="link">Visit example.com</Button>
	{/snippet}
</Story>

<Story name="Disabled">
	{#snippet template()}
		<div class="flex flex-wrap gap-3">
			<Button disabled>Default</Button>
			<Button variant="outline" disabled>Outline</Button>
		</div>
	{/snippet}
</Story>
