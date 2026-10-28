<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';

	/** A distinction (`normal`, `large`) or a review score (`score`) between two laurels (M-05 ε/στ). */
	export type LaurelScoreSize = 'normal' | 'large' | 'score';

	type LaurelLook = { row: string; glyph: string; label: string };

	/** 🔴 U-02.2: the three laurel looks the application draws: a stat badge, its large form, the reviews' score. */
	export const laurelScoreLooks: Record<LaurelScoreSize, LaurelLook> = {
		normal: {
			row: 'max-w-full flex-row items-center justify-center gap-1 px-1',
			glyph: 'icon-lg',
			label: 'text-center text-title-lg leading-flat font-semibold text-foreground'
		},
		large: {
			row: 'max-w-full flex-row items-center justify-center gap-2.5 px-1',
			glyph: 'icon-xl',
			label: 'text-heading-sm font-semibold text-foreground'
		},
		score: {
			row: 'flex-row items-center justify-center gap-2.5',
			glyph: 'icon-xl',
			label: 'text-display-xl font-semibold text-foreground'
		}
	};

	/** The outline's weight: firmer when the laurels wear the rating colour. */
	const FILLED_STROKE = 1.8;
	const OUTLINE_STROKE = 1.5;

	export type LaurelScoreProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		/** The words between the laurels («Επιλογή ασθενών», «4,9»), formatted by the caller. */
		label: string;
		size?: LaurelScoreSize;
		/** Laurels in the rating colour (S-32.11) with the firmer stroke; else in the text colour. */
		filled?: boolean;
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { HugeiconsLaurelWreathLeft01 } from '$shared/ui/icons/hugeicons-laurel-wreath-left-01';
	import { HugeiconsLaurelWreathRight01 } from '$shared/ui/icons/hugeicons-laurel-wreath-right-01';

	let {
		label,
		size = 'normal',
		filled = false,
		class: className,
		...restProps
	}: LaurelScoreProps = $props();

	const look = $derived(laurelScoreLooks[size]);
	const glyph = $derived(cn(look.glyph, filled ? 'text-rating' : 'text-foreground'));
	const stroke = $derived(filled ? FILLED_STROKE : OUTLINE_STROKE);
</script>

<div
	data-slot="laurel-score"
	data-size={size}
	data-filled={filled ? 'true' : 'false'}
	class={cn('flex', look.row, className)}
	{...restProps}
>
	<HugeiconsLaurelWreathLeft01 strokeWidth={stroke} class={glyph} />
	<span data-slot="laurel-score-label" class={look.label}>{label}</span>
	<HugeiconsLaurelWreathRight01 strokeWidth={stroke} class={glyph} />
</div>
