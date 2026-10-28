<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Avatar, AvatarImage, AvatarFallback } from '$shared/ui/primitives/avatar';

	const sizes = ['sm', 'md', 'lg', 'xl'] as const;

	// The application's meta (`atoms/avatar`): its `fallback` / `source` are the web's `AvatarFallback` / `AvatarImage`.
	const { Story } = defineMeta({
		title: 'Primitives/Avatar',
		component: Avatar,
		tags: ['autodocs'],
		args: { size: 'md' },
		argTypes: { size: { control: 'select', options: sizes } }
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<Avatar {...args}><AvatarFallback>ΝΚ</AvatarFallback></Avatar>
	{/snippet}
</Story>

<Story name="With Image">
	{#snippet template(args)}
		<Avatar {...args}>
			<AvatarImage src="https://i.pravatar.cc/160" alt="ΝΚ" />
			<AvatarFallback>ΝΚ</AvatarFallback>
		</Avatar>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template(args)}
		<div class="flex flex-row items-center gap-3">
			{#each sizes as size (size)}
				<Avatar {...args} {size}><AvatarFallback>ΝΚ</AvatarFallback></Avatar>
			{/each}
		</div>
	{/snippet}
</Story>

<!-- A photo that does not load shows the initials. -->
<Story name="Fallback On Error">
	{#snippet template(args)}
		<Avatar {...args}>
			<AvatarImage src="https://invalid.example/broken.png" alt="ΝΚ" />
			<AvatarFallback>ΝΚ</AvatarFallback>
		</Avatar>
	{/snippet}
</Story>
