<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Skeleton } from '$shared/ui/primitives/skeleton';

	// The application's meta (`atoms/skeleton`): a free class.
	const { Story } = defineMeta({
		title: 'Primitives/Skeleton',
		component: Skeleton,
		tags: ['autodocs'],
		args: { class: 'h-4 w-placeholder-xl' },
		argTypes: { class: { control: 'text' } }
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<Skeleton {...args} />
	{/snippet}
</Story>

<Story name="Text Lines">
	{#snippet template()}
		<div class="flex w-full max-w-narrow flex-col gap-3">
			<Skeleton class="h-4 w-3/4 rounded-full" />
			<Skeleton class="h-4 w-1/2 rounded-full" />
			<Skeleton class="h-4 w-2/3 rounded-full" />
		</div>
	{/snippet}
</Story>

<Story name="Card">
	{#snippet template()}
		<div class="flex w-full max-w-narrow flex-col gap-3">
			<Skeleton class="h-placeholder-xl w-full rounded-xl" />
			<Skeleton class="h-6 w-4/5 rounded-full" />
			<Skeleton class="h-4 w-3/5 rounded-full" />
		</div>
	{/snippet}
</Story>

<Story name="With Avatar">
	{#snippet template()}
		<div class="flex w-full max-w-narrow flex-row items-center gap-3">
			<Skeleton class="size-avatar-lg rounded-full" />
			<div class="flex flex-1 flex-col gap-2">
				<Skeleton class="h-4 w-3/4" />
				<Skeleton class="h-3 w-1/2" />
			</div>
		</div>
	{/snippet}
</Story>
