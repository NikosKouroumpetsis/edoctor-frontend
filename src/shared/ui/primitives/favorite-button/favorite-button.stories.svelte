<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { FavoriteButton } from '$shared/ui/primitives/favorite-button';

	// The application's meta (`atoms/favorite-button`); its `accessibilityLabel` is the web's `aria-label`.
	const { Story } = defineMeta({
		title: 'Primitives/FavoriteButton',
		component: FavoriteButton,
		tags: ['autodocs'],
		args: {
			'aria-label': 'Αγαπημένο',
			inset: 'md',
			onToggle: () => {},
			selected: false,
			size: 'lg'
		},
		argTypes: {
			inset: { control: 'radio', options: ['sm', 'md'] },
			selected: { control: 'boolean' },
			size: { control: 'radio', options: ['md', 'lg'] }
		}
	});
</script>

<!-- Every story sits on the token frame of a rail card's photo (168 × 152), as the application's decorator. -->
<Story name="Playground">
	{#snippet template(args)}
		<div class="relative h-card-rail-media w-card-rail-w rounded-xl bg-muted">
			<FavoriteButton {...args} />
		</div>
	{/snippet}
</Story>

<Story name="Selected" args={{ selected: true }}>
	{#snippet template(args)}
		<div class="relative h-card-rail-media w-card-rail-w rounded-xl bg-muted">
			<FavoriteButton {...args} />
		</div>
	{/snippet}
</Story>

<!-- The rail card's heart: 20, closer to the corner. -->
<Story name="Rail Card" args={{ inset: 'sm', size: 'md' }}>
	{#snippet template(args)}
		<div class="relative h-card-rail-media w-card-rail-w rounded-xl bg-muted">
			<FavoriteButton {...args} />
		</div>
	{/snippet}
</Story>

<Story name="Rail Card Selected" args={{ inset: 'sm', selected: true, size: 'md' }}>
	{#snippet template(args)}
		<div class="relative h-card-rail-media w-card-rail-w rounded-xl bg-muted">
			<FavoriteButton {...args} />
		</div>
	{/snippet}
</Story>
