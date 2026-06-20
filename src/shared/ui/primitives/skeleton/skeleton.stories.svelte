<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Skeleton } from '$shared/ui/primitives/skeleton';

	const { Story } = defineMeta({
		title: 'Primitives/Skeleton',
		component: Skeleton,
		tags: ['autodocs']
	});
</script>

<Story name="Line">
	{#snippet template()}
		<div class="flex w-72 flex-col gap-2">
			<Skeleton class="h-4 w-full" />
			<Skeleton class="h-4 w-4/5" />
			<Skeleton class="h-4 w-2/3" />
		</div>
	{/snippet}
</Story>

<Story name="Card placeholder">
	{#snippet template()}
		<div class="flex w-72 items-center gap-3">
			<Skeleton class="size-12 rounded-full" />
			<div class="flex flex-1 flex-col gap-2">
				<Skeleton class="h-4 w-3/4" />
				<Skeleton class="h-3 w-1/2" />
			</div>
		</div>
	{/snippet}
</Story>
