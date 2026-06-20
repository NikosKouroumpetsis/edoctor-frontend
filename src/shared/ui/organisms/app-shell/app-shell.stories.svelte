<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AppShell from '$shared/ui/organisms/app-shell';

	const { Story } = defineMeta({
		title: 'Organisms/App shell',
		component: AppShell,
		tags: ['autodocs']
	});
</script>

<!--
	Full page layout (navbar + content slot + footer/bottom-nav). Rendered inside a
	fixed-height, clipped container so the full-page chrome fits the canvas.
-->
<Story name="Default">
	{#snippet template()}
		<div class="h-[600px] overflow-auto rounded-lg border">
			<AppShell>
				<div class="mx-auto max-w-3xl p-6">
					<h1 class="text-title-lg font-semibold">Dashboard</h1>
					<p class="mt-2 text-body-md text-muted-foreground">
						The app shell composes the navbar, this content area, and the footer / bottom navigation
						around any page.
					</p>
				</div>
			</AppShell>
		</div>
	{/snippet}
</Story>
