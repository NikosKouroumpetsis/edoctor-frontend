<script lang="ts">
	import { CarouselSection, type CarouselSectionTrailing } from './index';

	let {
		subtitle,
		trailing,
		itemsClass
	}: { subtitle?: string; trailing?: CarouselSectionTrailing; itemsClass?: string } = $props();
</script>

<CarouselSection
	title="Δημοφιλείς γιατροί"
	{subtitle}
	{trailing}
	{itemsClass}
	class="harness-column"
>
	<a href="#one" class="block size-touch">Κάρτα 1</a>
	<a href="#two" class="block size-touch">Κάρτα 2</a>
</CarouselSection>
