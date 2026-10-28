<script lang="ts">
	import type { ContainerWidth } from '$shared/ui/molecules/container';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { StickyTopBar } from './index';

	let { backgroundOpacity, width }: { backgroundOpacity?: number; width?: ContainerWidth } =
		$props();
</script>

<StickyTopBar {backgroundOpacity} {width} data-testid="bar">
	{#snippet leading()}
		<IconButton icon="chevron-back" appearance="scrim" aria-label="Πίσω" />
	{/snippet}
	{#snippet trailing()}
		<IconButton icon="share-social-outline" appearance="scrim" aria-label="Κοινοποίηση" />
		<IconButton icon="heart-outline" appearance="scrim" aria-label="Αγαπημένο" />
	{/snippet}
</StickyTopBar>
