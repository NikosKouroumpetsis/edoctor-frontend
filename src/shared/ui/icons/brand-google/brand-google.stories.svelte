<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { BrandApple } from '$shared/ui/icons/brand-apple';
	import { BrandGoogle } from '$shared/ui/icons/brand-google';
	import { HugeiconsLaurelWreathLeft01 } from '$shared/ui/icons/hugeicons-laurel-wreath-left-01';
	import { HugeiconsLaurelWreathRight01 } from '$shared/ui/icons/hugeicons-laurel-wreath-right-01';

	const { Story } = defineMeta({
		title: 'Icons/Brand marks',
		component: BrandGoogle,
		tags: ['autodocs']
	});
</script>

<Story name="Brands">
	{#snippet template()}
		<div class="flex items-center gap-4 text-foreground">
			<BrandGoogle class="icon-lg" />
			<BrandApple class="icon-lg" />
			<BrandGoogle class="icon-xl" />
			<BrandApple class="icon-xl" />
		</div>
	{/snippet}
</Story>

<Story name="Laurels">
	{#snippet template()}
		<div class="flex flex-col gap-3">
			<div class="flex items-center gap-2 text-rating">
				<HugeiconsLaurelWreathLeft01 class="icon-xl" strokeWidth={1.8} />
				<span class="text-display-xl font-semibold text-foreground">4,9</span>
				<HugeiconsLaurelWreathRight01 class="icon-xl" strokeWidth={1.8} />
			</div>
			<div class="flex items-center gap-1 text-foreground">
				<HugeiconsLaurelWreathLeft01 class="icon-lg" />
				<span class="text-title-lg leading-flat font-semibold">Επιλογή ασθενών</span>
				<HugeiconsLaurelWreathRight01 class="icon-lg" />
			</div>
		</div>
	{/snippet}
</Story>
