<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import BottomNav from '$shared/ui/organisms/bottom-nav';

	const { Story } = defineMeta({
		title: 'Organisms/Bottom nav',
		component: BottomNav,
		tags: ['autodocs']
	});
</script>

<!-- Mobile bottom navigation. Reads $app/state (page.url) for the active item. -->
<Story name="Default">
	{#snippet template()}
		<div class="relative mx-auto h-40 w-[390px] overflow-hidden rounded-lg border bg-background">
			<BottomNav />
		</div>
	{/snippet}
</Story>
