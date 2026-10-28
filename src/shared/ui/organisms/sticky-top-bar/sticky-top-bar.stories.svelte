<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { StickyTopBar } from '$shared/ui/organisms/sticky-top-bar';
	import { IconButton } from '$shared/ui/primitives/icon-button';

	const noop = () => {};

	// The application's meta (`organisms/sticky-top-bar`): the opaque card bar over the muted hero frame. The web bar is
	// pinned to the top edge (the frame's top here); the browser has no status band (U-09.5: 10 above and below).
	const { Story } = defineMeta({
		title: 'Organisms/StickyTopBar',
		component: StickyTopBar,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen', docs: { story: { inline: false, iframeHeight: 640 } } },
		args: { backgroundOpacity: 1 },
		argTypes: { backgroundOpacity: { control: { type: 'range', min: 0, max: 1, step: 0.05 } } },
		render: template
	});
</script>

{#snippet back()}
	<IconButton icon="chevron-back" appearance="scrim" aria-label="Πίσω" onclick={noop} />
{/snippet}

{#snippet buttons()}
	<IconButton
		icon="share-social-outline"
		appearance="scrim"
		aria-label="Κοινοποίηση"
		onclick={noop}
	/>
	<IconButton icon="heart-outline" appearance="scrim" aria-label="Αποθήκευση" onclick={noop} />
{/snippet}

{#snippet template(args: Record<string, unknown>)}
	<div class="h-hero-h bg-muted">
		<StickyTopBar {...args} leading={back} trailing={buttons} />
	</div>
{/snippet}

<!-- The page scrolled past its hero: the opaque card bar. -->
<Story name="Opaque" />

<!-- At the top of the page: the background has not faded in, the buttons sit on the photo. -->
<Story name="Over Media" args={{ backgroundOpacity: 0 }} />

<Story name="Half Faded" args={{ backgroundOpacity: 0.5 }} />

<Story name="Leading Only">
	{#snippet template(args)}
		<div class="h-hero-h bg-muted">
			<StickyTopBar {...args} leading={back} />
		</div>
	{/snippet}
</Story>
