<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import {
		Carousel,
		CarouselContent,
		CarouselItem,
		CarouselPrevious,
		CarouselNext,
		CarouselDots
	} from '$shared/ui/primitives/carousel';

	const slides = ['Ένα', 'Δύο', 'Τρία'];

	// The application's meta (`molecules/carousel`): a controlled carousel with its arrows, no dots; the words are the
	// application's catalog (`common.previousSlide` …).
	const { Story } = defineMeta({
		title: 'Primitives/Carousel',
		component: Carousel,
		tags: ['autodocs'],
		args: { loop: false, autoPlay: false },
		argTypes: {
			loop: { control: 'boolean' },
			autoPlay: { control: 'boolean' },
			autoPlayIntervalMs: { control: 'number' }
		}
	});
</script>

<script lang="ts">
	let index = $state(0);
	let withDots = $state(0);
	let looped = $state(0);
	let playing = $state(0);
</script>

<!-- The arrows sit over the slide, 12 from its sides and centred on its height (U-09.3); with a pointer they show
     while it is over the carousel (or the focus is in it), on touch always; an end without `loop` has no arrow out. -->
{#snippet carousel(
	options: { loop?: boolean; autoPlay?: boolean; autoPlayIntervalMs?: number },
	dots: boolean,
	current: number,
	set: (i: number) => void
)}
	<div class="flex w-full max-w-narrow flex-col gap-2">
		<Carousel {...options} index={current} onIndexChange={set}>
			<CarouselContent>
				{#each slides as label (label)}
					<CarouselItem>
						<div class="flex h-placeholder-xl items-center justify-center rounded-xl bg-muted">
							<p class="text-title-md font-semibold text-foreground">{label}</p>
						</div>
					</CarouselItem>
				{/each}
			</CarouselContent>
			<CarouselPrevious label="Προηγούμενη διαφάνεια" />
			<CarouselNext label="Επόμενη διαφάνεια" />
			{#if dots}
				<CarouselDots dotLabel={(slide) => `Μετάβαση στη διαφάνεια ${slide + 1}`} />
			{/if}
		</Carousel>
		<p class="text-center text-body-sm text-muted-foreground">Διαφάνεια {current + 1}</p>
	</div>
{/snippet}

<Story name="Default">
	{#snippet template(args)}
		{@render carousel(
			{ loop: args.loop, autoPlay: args.autoPlay, autoPlayIntervalMs: args.autoPlayIntervalMs },
			false,
			index,
			(i) => (index = i)
		)}
	{/snippet}
</Story>

<Story name="With Dots">
	{#snippet template(args)}
		{@render carousel(
			{ loop: args.loop, autoPlay: args.autoPlay, autoPlayIntervalMs: args.autoPlayIntervalMs },
			true,
			withDots,
			(i) => (withDots = i)
		)}
	{/snippet}
</Story>

<!-- `loop` keeps both arrows and wraps the index at the ends. -->
<Story name="Loop" args={{ loop: true }}>
	{#snippet template(args)}
		{@render carousel(
			{ loop: args.loop, autoPlay: args.autoPlay, autoPlayIntervalMs: args.autoPlayIntervalMs },
			true,
			looped,
			(i) => (looped = i)
		)}
	{/snippet}
</Story>

<!-- `autoPlay` moves on by itself (it waits while the pointer or the keyboard's focus is on it, a press re-arms it;
     whatever the motion setting, U-12.1). -->
<Story name="Auto Play" args={{ autoPlay: true, autoPlayIntervalMs: 2000, loop: true }}>
	{#snippet template(args)}
		{@render carousel(
			{ loop: args.loop, autoPlay: args.autoPlay, autoPlayIntervalMs: args.autoPlayIntervalMs },
			true,
			playing,
			(i) => (playing = i)
		)}
	{/snippet}
</Story>
