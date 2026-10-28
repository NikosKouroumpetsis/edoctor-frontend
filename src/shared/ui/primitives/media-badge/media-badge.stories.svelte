<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { MediaBadge } from '$shared/ui/primitives/media-badge';

	// The application's meta (`atoms/media-badge`), on the token frame of a rail card's photo (168 × 152).
	const { Story } = defineMeta({
		title: 'Primitives/MediaBadge',
		component: MediaBadge,
		tags: ['autodocs'],
		args: { label: 'Νέο', maxLines: 1, width: 'auto' },
		argTypes: {
			besideAction: { control: 'boolean' },
			maxLines: { control: 'radio', options: [1, 2] },
			width: { control: 'radio', options: ['auto', 'badge'] }
		}
	});
</script>

<Story name="Auto">
	{#snippet template(args)}
		<div class="relative h-card-rail-media w-card-rail-w rounded-xl bg-muted">
			<MediaBadge {...args} />
		</div>
	{/snippet}
</Story>

<!-- At least the badge width, as wide as the photo allows: a longer label wraps to two lines (U-06.3). -->
<Story
	name="Badge Width Two Lines"
	args={{ label: 'Επιλογή της κοινότητας', maxLines: 2, width: 'badge' }}
>
	{#snippet template(args)}
		<div class="relative h-card-rail-media w-card-rail-w rounded-xl bg-muted">
			<MediaBadge {...args} />
		</div>
	{/snippet}
</Story>
