<script lang="ts">
	import {
		Carousel,
		CarouselContent,
		CarouselItem,
		CarouselPrevious,
		CarouselNext,
		CarouselDots
	} from './index';

	let { index = $bindable(0) }: { index?: number } = $props();
</script>

<Carousel bind:index>
	<CarouselContent>
		<CarouselItem>Slide one</CarouselItem>
		<CarouselItem>Slide two</CarouselItem>
		<CarouselItem>Slide three</CarouselItem>
	</CarouselContent>
	<CarouselPrevious />
	<CarouselNext />
	<CarouselDots />
</Carousel>
