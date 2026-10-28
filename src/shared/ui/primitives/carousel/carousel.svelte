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
		/** The arrows hand in their buttons, so the keyboard's focus survives one hiding at an end. */
		setArrow: (which: 'previous' | 'next', element: HTMLElement | null) => void;
	};
	export const [getCarouselContext, setCarouselContext] =
		createContext<CarouselContext>('Carousel');

	/** The application's `autoPlayIntervalMs` default. */
	const DEFAULT_AUTOPLAY_INTERVAL_MS = 4000;

	/**
	 * The arrows over the photo (U-09.3, Airbnb's, airbnb-facts 5η): a 32 circle of the 90 % white scrim with a
	 * shadow and a 12 chevron, 12 from the photo's side (the 48 target 4 from it), centred on its height. On a
	 * screen with a pointer (`can-hover`) they show while the pointer is over the carousel or the focus is in it;
	 * on touch always. `PhotoCarousel` draws the same arrows; each arrow's tag writes its own 48 box (`size-touch`).
	 */
	export const carouselArrowClasses = {
		box: 'group/carousel-arrow inline-flex items-center justify-center rounded-full outline-none disabled:invisible',
		reveal:
			'transition-opacity duration-standard ease-standard can-hover:opacity-0 can-hover:group-hover/carousel:opacity-100 can-hover:group-focus-within/carousel:opacity-100',
		shape:
			'inline-flex size-control-xs items-center justify-center rounded-full bg-media-scrim/90 shadow-raised group-hover/carousel-arrow:bg-media-scrim group-focus-visible/carousel-arrow:ring-3 group-focus-visible/carousel-arrow:ring-ring/50',
		glyph: 'icon-xs text-secondary'
	} as const;
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { keepArrowFocus } from '$shared/lib/headless';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		index = $bindable(0),
		loop = false,
		autoPlay = false,
		autoPlayIntervalMs = DEFAULT_AUTOPLAY_INTERVAL_MS,
		roleDescription,
		class: className,
		onIndexChange,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		index?: number;
		loop?: boolean;
		/**
		 * Moves on by itself every `autoPlayIntervalMs` (the application's, default 4000) while there are two slides
		 * or more; a press on an arrow or a dot re-arms the timer (the application's). It waits while the pointer is
		 * over the carousel or the KEYBOARD's focus is in it (`:focus-visible`, WCAG 2.2.2, U-11.3), whatever the
		 * device's motion setting (U-12.1).
		 */
		autoPlay?: boolean;
		autoPlayIntervalMs?: number;
		/** What the carousel is called aloud («καρουζέλ»), already localized; omitted when absent. */
		roleDescription?: string;
		onIndexChange?: (index: number) => void;
	} = $props();

	let count = $state(0);
	let hovered = $state(false);
	// The keyboard's focus only: a pressed arrow takes the focus too, and a press re-arms the timer (U-11.3).
	let keyboardFocusWithin = $state(false);
	const arrows = $state<{ previous: HTMLElement | null; next: HTMLElement | null }>({
		previous: null,
		next: null
	});

	function clamp(i: number): number {
		if (count === 0) return 0;
		if (loop) return (i + count) % count;
		return Math.min(Math.max(i, 0), count - 1);
	}

	function scrollTo(next: number) {
		index = clamp(next);
		onIndexChange?.(index);
	}

	const canPrev = $derived(loop || index > 0);
	const canNext = $derived(loop || index < count - 1);

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
			return canPrev;
		},
		get canNext() {
			return canNext;
		},
		scrollTo,
		scrollPrev: () => scrollTo(index - 1),
		scrollNext: () => scrollTo(index + 1),
		register() {
			count += 1;
			return () => {
				count -= 1;
			};
		},
		setArrow(which, element) {
			arrows[which] = element;
		}
	});

	// Before an arrow hides at an end, the keyboard's focus on it moves to the other one (as `Rail`, NIT-4).
	$effect.pre(() => {
		keepArrowFocus(arrows, { previous: canPrev, next: canNext });
	});

	// Reading `index` re-arms the timer after every move, the press's too.
	$effect(() => {
		const current = index;
		if (!autoPlay || count < 2 || hovered || keyboardFocusWithin) return;
		const timer = setInterval(() => scrollTo(current + 1), autoPlayIntervalMs);
		return () => clearInterval(timer);
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

<!-- One grid cell holds the slides and, over them, the arrows (centred on the slides' height, not on the dots under
     them); the dots take the next row. `relative`: a caller's own `absolute` parts sit on the carousel. -->
<div
	bind:this={ref}
	role="region"
	aria-roledescription={roleDescription}
	data-slot="carousel"
	{onkeydown}
	onpointerenter={() => (hovered = true)}
	onpointerleave={() => (hovered = false)}
	onfocusin={(event) =>
		(keyboardFocusWithin =
			event.target instanceof Element && event.target.matches(':focus-visible'))}
	onfocusout={(event) => {
		const next = event.relatedTarget;
		if (!(next instanceof Node && event.currentTarget.contains(next))) keyboardFocusWithin = false;
	}}
	class={cn('group/carousel relative grid grid-cols-1', className)}
	{...restProps}
>
	{@render children?.()}
</div>
