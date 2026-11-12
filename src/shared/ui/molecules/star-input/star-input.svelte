<script lang="ts" module>
	/**
	 * 🔴 U-138.2 (D-W4-27, the prototype's `appt.js:609`): a press on star `star` (1…) gives it whole (`2·star`); a second
	 * press on the same whole star makes it half (`2·star − 1`); a third whole again. One point a half star (U-49).
	 */
	export function toggleStar(current: number, star: number): number {
		return current === 2 * star ? 2 * star - 1 : 2 * star;
	}

	/**
	 * P-W4 Σ-11 (= the application's `adjustable`, P-A4 §8): the value a key gives, half a star a step — ← ↓ one less,
	 * → ↑ one more, Home a half, End every star — held between a half and `2·stars` once a star is given; from none,
	 * only up. `null` for any other key, which the page keeps.
	 */
	export function starInputKey(current: number, key: string, stars: number): number | null {
		const top = 2 * stars;
		switch (key) {
			case 'ArrowRight':
			case 'ArrowUp':
				return Math.min(top, Math.max(1, current + 1));
			case 'ArrowLeft':
			case 'ArrowDown':
				return current <= 0 ? 0 : Math.max(1, current - 1);
			case 'Home':
				return 1;
			case 'End':
				return top;
			default:
				return null;
		}
	}
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';

	let {
		ref = $bindable(null),
		value = $bindable(0),
		stars = 5,
		disabled = false,
		valueText,
		onValueChange,
		class: className,
		...restProps
	}: WithElementRef<
		Omit<
			HTMLAttributes<HTMLDivElement>,
			'children' | 'role' | 'tabindex' | 'onclick' | 'onkeydown'
		>,
		HTMLDivElement
	> & {
		/** 0 (none) or 1…`2·stars`: one point a half star (U-49; the server stores 1–10). */
		value?: number;
		/** How many stars (five by default). */
		stars?: number;
		/** 🔴 The slider's name, the caller's (the aspect it rates): ARIA requires one, so it is never left out. */
		'aria-label': string;
		disabled?: boolean;
		/**
		 * 🔴 What a screen reader hears for a value, the caller's, already localized (U-03.5): «4,5 στα 5», «Χωρίς
		 * βαθμό» for none — never left to a bare number.
		 */
		valueText: (value: number) => string;
		onValueChange?: (value: number) => void;
	} = $props();

	const indexes = $derived(Array.from({ length: Math.max(0, Math.round(stars)) }, (_, at) => at));
	const fillOf = (index: number) => {
		const left = value / 2 - index;
		return left >= 1 ? 'true' : left >= 0.5 ? 'half' : 'false';
	};

	function commit(next: number) {
		if (next === value) return;
		value = next;
		onValueChange?.(next);
	}

	function press(event: MouseEvent) {
		if (disabled) return;
		const star = Number(
			(event.target as Element | null)?.closest<HTMLElement>('[data-star]')?.dataset.star
		);
		if (Number.isInteger(star) && star >= 1) commit(toggleStar(value, star));
	}

	function key(event: KeyboardEvent) {
		if (disabled) return;
		const next = starInputKey(value, event.key, indexes.length);
		if (next === null) return;
		event.preventDefault();
		commit(next);
	}
</script>

<!-- 🔴 U-138.2, P-W4 Σ-11: ONE slider a row of stars (one Tab stop), its value 0–10 and the caller's words for it; the
     stars inside are its picture, each in a 48 box for the finger (the application's `icon.xl` 32 inside 48, D-W3-25:
     the prototype's 30 in 44). A press is whole, the same star again half. U-100: no colour under the pointer, no tap
     flash; a double tap is two presses, never a zoom. The stars are the read-only `Rating`'s (one star in the product,
     D-W4-27): `rating`, the empty one `muted-foreground/24`. -->
<div
	bind:this={ref}
	data-slot="star-input"
	data-disabled={disabled ? '' : undefined}
	role="slider"
	tabindex={disabled ? -1 : 0}
	aria-valuemin={0}
	aria-valuemax={2 * indexes.length}
	aria-valuenow={value}
	aria-valuetext={valueText(value)}
	aria-orientation="horizontal"
	aria-disabled={disabled || undefined}
	class={cn(
		'inline-flex min-h-touch min-w-touch shrink-0 flex-row items-center rounded-md outline-none select-none',
		'cursor-pointer touch-manipulation [-webkit-tap-highlight-color:transparent] focus-visible:ring-3 focus-visible:ring-ring/50',
		'aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
		className
	)}
	{...restProps}
	onclick={press}
	onkeydown={key}
>
	{#each indexes as index (index)}
		{@const filled = fillOf(index)}
		<span
			data-slot="star-input-star"
			data-star={index + 1}
			data-filled={filled}
			aria-hidden="true"
			class="grid size-touch shrink-0 place-items-center"
		>
			{#if filled === 'half'}
				<span class="relative inline-flex icon-xl">
					<Ionicon name="star" class="icon-xl text-muted-foreground/24" />
					<span class="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
						<Ionicon name="star" class="icon-xl text-rating" />
					</span>
				</span>
			{:else}
				<Ionicon
					name="star"
					class={cn('icon-xl', filled === 'true' ? 'text-rating' : 'text-muted-foreground/24')}
				/>
			{/if}
		</span>
	{/each}
</div>
