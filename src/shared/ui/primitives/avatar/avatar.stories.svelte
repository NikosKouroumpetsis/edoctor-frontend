<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Avatar, AvatarImage, AvatarFallback } from '$shared/ui/primitives/avatar';

	const { Story } = defineMeta({
		title: 'Primitives/Avatar',
		component: Avatar,
		tags: ['autodocs']
	});
</script>

<Story name="With image">
	{#snippet template()}
		<Avatar>
			<AvatarImage
				src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=128&q=80"
				alt="Dr. Jane Doe"
			/>
			<AvatarFallback>JD</AvatarFallback>
		</Avatar>
	{/snippet}
</Story>

<Story name="Fallback (broken src)">
	{#snippet template()}
		<Avatar>
			<AvatarImage src="https://invalid.example/broken.png" alt="Dr. Jane Doe" />
			<AvatarFallback>JD</AvatarFallback>
		</Avatar>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template()}
		<div class="flex items-center gap-3">
			<Avatar size="sm"><AvatarFallback>SM</AvatarFallback></Avatar>
			<Avatar size="default"><AvatarFallback>MD</AvatarFallback></Avatar>
			<Avatar size="lg"><AvatarFallback>LG</AvatarFallback></Avatar>
		</div>
	{/snippet}
</Story>
