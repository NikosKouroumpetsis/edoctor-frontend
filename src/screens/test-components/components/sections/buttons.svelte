<script lang="ts">
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Button } from '$shared/ui/primitives/button';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { TextButton } from '$shared/ui/primitives/text-button';
	import DemoSection from '../demo-section.svelte';
	import DemoRow from '../demo-row.svelte';
</script>

<DemoSection
	id="buttons"
	title="Button"
	description="The application's Button: tones, sizes, radii, label case and states; IconButton and TextButton."
>
	<DemoRow label="Tones">
		<Button label="Primary" />
		<Button tone="secondary" label="Secondary" />
		<Button tone="accent" label="Accent" />
		<Button tone="contrast" label="Contrast" />
		<Button tone="ghost" label="Ghost" />
		<Button tone="muted" label="Muted" />
		<Button tone="outline" label="Outline" />
	</DemoRow>

	<DemoRow label="Sizes and radii">
		<Button size="default" label="Default" />
		<Button size="lg" label="Large" />
		<Button radius="full" label="Pill" />
		<Button labelCase="uppercase" label="Uppercase" />
	</DemoRow>

	<DemoRow label="States">
		<Button disabled label="Disabled" />
		<Button loading label="Loading" />
		<Button href="#buttons" label="As link" />
		<Button label="With icon">
			{#snippet leading()}
				<Ionicon name="search" class="icon-sm text-primary-foreground" />
			{/snippet}
		</Button>
	</DemoRow>

	<DemoRow label="Icon and text buttons">
		<IconButton icon="arrow-back" aria-label="Back" />
		<IconButton icon="options-outline" count={2} aria-label="Filters" />
		<IconButton appearance="outline" icon="close" aria-label="Close" />
		<IconButton appearance="tint" surface="soft" size="xs" icon="close" aria-label="Dismiss" />
		<TextButton label="Show all" underline />
	</DemoRow>
</DemoSection>
