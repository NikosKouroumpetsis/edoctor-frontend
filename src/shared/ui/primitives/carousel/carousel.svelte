<script lang="ts" module>
	import { createContext } from '$shared/lib/headless';

	export type CarouselContext = {
		readonly index: number;
		readonly count: number;
		readonly loop: boolean;
		readonly canPrev: boolean;
		readonly canNext: boolean;
		scrollTo: (index: number) => void;
		scrollPrev: () => void;
		scrollNext: () => void;
		register: () => () => void;
	};
	export const [getCarouselContext, setCarouselContext] =
		createContext<CarouselContext>('Carousel');
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		index = $bindable(0),
		loop = false,
		class: className,
		onIndexChange,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		index?: number;
		loop?: boolean;
		onIndexChange?: (index: number) => void;
	} = $props();

	let count = $state(0);

	function clamp(i: number): number {
		if (count === 0) return 0;
		if (loop) return (i + count) % count;
		return Math.min(Math.max(i, 0), count - 1);
	}

	function scrollTo(next: number) {
		index = clamp(next);
		onIndexChange?.(index);
	}

	setCarouselContext({
		get index() {
			return index;
		},
		get count() {
			return count;
		},
		get loop() {
			return loop;
		},
		get canPrev() {
			return loop || index > 0;
		},
		get canNext() {
			return loop || index < count - 1;
		},
		scrollTo,
		scrollPrev: () => scrollTo(index - 1),
		scrollNext: () => scrollTo(index + 1),
		register() {
			count += 1;
			return () => {
				count -= 1;
			};
		}
	});

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			scrollTo(index - 1);
		} else if (event.key === 'ArrowRight') {
			event.preventDefault();
			scrollTo(index + 1);
		}
	}
</script>

<div
	bind:this={ref}
	role="region"
	aria-roledescription="carousel"
	data-slot="carousel"
	{onkeydown}
	class={cn('relative', className)}
	{...restProps}
>
	{@render children?.()}
</div>
