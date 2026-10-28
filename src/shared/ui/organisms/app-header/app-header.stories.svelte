<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { AppHeader } from '$shared/ui/organisms/app-header';
	import { Button } from '$shared/ui/primitives/button';

	const { Story } = defineMeta({
		title: 'Organisms/AppHeader',
		component: AppHeader,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' }
	});
</script>

<Story name="Default">
	{#snippet template()}
		<AppHeader>
			{#snippet brand()}
				<a href="#home" class="inline-flex min-h-touch min-w-touch items-center font-semibold"
					>Δείγμα</a
				>
			{/snippet}
			{#snippet nav()}
				<nav class="ml-4 hidden items-center gap-touch-gap laptop:flex" aria-label="Κύρια πλοήγηση">
					<a href="#a" class="inline-flex min-h-touch min-w-touch items-center px-3 text-body-sm"
						>Ενότητα Α</a
					>
					<a href="#b" class="inline-flex min-h-touch min-w-touch items-center px-3 text-body-sm"
						>Ενότητα Β</a
					>
				</nav>
			{/snippet}
			{#snippet actions()}
				<Button tone="outline" label="Σύνδεση" class="hidden @form:inline-flex" />
			{/snippet}
		</AppHeader>
	{/snippet}
</Story>
