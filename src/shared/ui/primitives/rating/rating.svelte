<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';

	/**
	 * The application's four rating looks (M-05 α–δ): `inline` — one star and the score in a card's meta line;
	 * `stat` — the score over a row of small stars; `value` — the score and one star; `stars` — a row of stars, the
	 * first `value` filled.
	 */
	export type RatingVariant = 'inline' | 'stat' | 'value' | 'stars';
	/** The text size of the card's meta line (`xs` 13 · `sm` 14 · `md` 15 · `lg` 16), the application's name. */
	export type MetaLineSize = 'xs' | 'sm' | 'md' | 'lg';
	/** The text size of the `inline` label: the meta line's. */
	export type RatingSize = MetaLineSize;
	/** The colour of the `inline` label: the primary text colour of the card (S-32.19) or the text colour. */
	export type RatingLabelTone = 'primary' | 'foreground';

	/**
	 * 🔴 U-05.3: ONE size map for «★ score» (the application's `META_LINE_SIZE_CLASS_NAMES`), read by both ways of
	 * drawing it — the `inline` rating here and every fact of `MetaRow` — so the card's two forms never drift apart.
	 */
	export const metaLineSizes: Record<MetaLineSize, string> = {
		xs: 'text-label-lg',
		sm: 'text-body-sm',
		md: 'text-body-md',
		lg: 'text-body-lg'
	};
	const labelTones: Record<RatingLabelTone, string> = {
		primary: 'text-primary-text',
		foreground: 'text-foreground'
	};

	type RatingLook =
		| {
				variant: 'inline';
				/** The score or a word for none («4,9», «Νέο», S-31.1), formatted by the caller (S-31.2). */
				label: string;
				size?: RatingSize;
				labelTone?: RatingLabelTone;
				value?: undefined;
				max?: undefined;
		  }
		| {
				variant: 'stat';
				label: string;
				/** How many stars the row draws, all filled. */
				max?: number;
				value?: undefined;
				size?: undefined;
				labelTone?: undefined;
		  }
		| {
				variant: 'value';
				label: string;
				value?: undefined;
				max?: undefined;
				size?: undefined;
				labelTone?: undefined;
		  }
		| {
				variant: 'stars';
				/** How many of the stars are filled. */
				value: number;
				max?: number;
				label?: undefined;
				size?: undefined;
				labelTone?: undefined;
		  };

	export type RatingProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> &
		RatingLook & {
			/** The whole rating as one named image («4,9 στα 5»), from the caller; without it the words read alone. */
			'aria-label'?: string;
		};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';

	let {
		variant,
		label,
		value,
		max = 5,
		size = 'md',
		labelTone = 'primary',
		'aria-label': ariaLabel,
		class: className,
		...restProps
	}: RatingProps = $props();

	const stars = $derived(Array.from({ length: Math.max(0, Math.round(max)) }, (_, index) => index));
	const named = $derived(Boolean(ariaLabel));
</script>

<div
	data-slot="rating"
	data-variant={variant}
	role={named ? 'img' : undefined}
	aria-label={ariaLabel}
	class={cn(
		variant === 'stat'
			? 'inline-flex flex-col items-center justify-center gap-1.5 py-1'
			: variant === 'inline'
				? 'inline-flex flex-row items-center gap-1.5'
				: 'inline-flex flex-row items-center gap-1',
		className
	)}
	{...restProps}
>
	{#if variant === 'inline'}
		<Ionicon name="star" class="icon-sm text-rating" />
		<span
			aria-hidden={named || undefined}
			class={cn('font-semibold', metaLineSizes[size], labelTones[labelTone])}>{label}</span
		>
	{:else if variant === 'stat'}
		<span aria-hidden={named || undefined} class="text-body-lg font-semibold text-foreground"
			>{label}</span
		>
		<span class="inline-flex flex-row items-center gap-px" aria-hidden="true">
			{#each stars as index (index)}
				<Ionicon name="star" class="icon-xs text-rating" />
			{/each}
		</span>
	{:else if variant === 'value'}
		<span aria-hidden={named || undefined} class="text-title-md font-bold text-foreground"
			>{label}</span
		>
		<Ionicon name="star" class="icon-sm text-rating" />
	{:else}
		{#each stars as index (index)}
			<Ionicon
				name="star"
				data-filled={index < (value ?? 0) ? 'true' : 'false'}
				class={cn('icon-sm', index < (value ?? 0) ? 'text-rating' : 'text-muted-foreground/24')}
			/>
		{/each}
	{/if}
</div>
