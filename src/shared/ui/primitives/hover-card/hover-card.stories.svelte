<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import {
		HoverCard,
		HoverCardTrigger,
		HoverCardContent,
		type HoverCardSize
	} from '$shared/ui/primitives/hover-card';
	import { buttonClasses } from '$shared/ui/primitives/button';

	const sizes: HoverCardSize[] = ['sm', 'md', 'lg'];

	// The application's hover card (`molecules/hover-card`, its long press; here the pointer or the focus): the ghost
	// «@iatros» opens «Δρ. Παπαδόπουλος», 256 wide by default (`md`, R7-2). It fades in and grows from 95 % (U-09.8).
	const { Story } = defineMeta({
		title: 'Primitives/HoverCard',
		component: HoverCard,
		tags: ['autodocs']
	});
</script>

{#snippet card(
	label = '@iatros',
	line = 'Καρδιολόγος — Αθήνα',
	size: HoverCardSize | undefined = undefined
)}
	<HoverCard openDelay={0} closeDelay={0}>
		<HoverCardTrigger class={buttonClasses({ tone: 'ghost' })}>{label}</HoverCardTrigger>
		<HoverCardContent {size}>
			<div class="flex flex-col gap-1.5">
				<p class="text-title-sm font-semibold text-foreground">Δρ. Παπαδόπουλος</p>
				<p class="text-body-sm text-muted-foreground">{line}</p>
			</div>
		</HoverCardContent>
	</HoverCard>
{/snippet}

<Story name="Playground">
	{#snippet template()}{@render card()}{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template()}
		<div class="flex flex-wrap gap-3">
			{#each sizes as size (size)}
				{@render card(`@iatros (${size})`, `Το ${size} ορίζει το πλάτος της κάρτας.`, size)}
			{/each}
		</div>
	{/snippet}
</Story>
