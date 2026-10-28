<script lang="ts">
	import {
		Carousel,
		CarouselContent,
		CarouselItem,
		CarouselPrevious,
		CarouselNext,
		CarouselDots
	} from './index';

	let {
		index = $bindable(0),
		loop = false,
		autoPlay = false,
		autoPlayIntervalMs
	}: { index?: number; loop?: boolean; autoPlay?: boolean; autoPlayIntervalMs?: number } = $props();
</script>

<Carousel bind:index {loop} {autoPlay} {autoPlayIntervalMs} roleDescription="carousel">
	<CarouselContent>
		<CarouselItem roleDescription="slide">Slide one</CarouselItem>
		<CarouselItem roleDescription="slide">Slide two</CarouselItem>
		<CarouselItem roleDescription="slide">Slide three</CarouselItem>
	</CarouselContent>
	<CarouselPrevious label="Previous slide" />
	<CarouselNext label="Next slide" />
	<CarouselDots dotLabel={(slide) => `Go to slide ${slide + 1}`} />
</Carousel>
