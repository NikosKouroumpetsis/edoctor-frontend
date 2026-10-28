<script lang="ts" module>
	export type SpinnerTone =
		| 'primary'
		| 'primary-foreground'
		| 'foreground'
		| 'secondary-foreground'
		| 'muted'
		| 'accent';
	export type SpinnerSize = 'sm' | 'md' | 'lg';

	// The on-colour tones are for a spinner INSIDE a filled surface (a solid button), as in the application.
	const toneClasses: Record<SpinnerTone, string> = {
		primary: 'text-primary',
		'primary-foreground': 'text-primary-foreground',
		foreground: 'text-foreground',
		'secondary-foreground': 'text-secondary-foreground',
		muted: 'text-muted-foreground',
		accent: 'text-accent'
	};

	// The native indicator is `small` for sm/md and `large` for lg; the web draws them at the icon scale.
	const sizeClasses: Record<SpinnerSize, string> = {
		sm: 'icon-md',
		md: 'icon-md',
		lg: 'icon-xl'
	};

	/** The eight spokes of the activity indicator, the leading one opaque and each one behind it fainter. */
	const SPOKES = Array.from({ length: 8 }, (_, index) => ({
		angle: index * 45,
		opacity: (index + 1) / 8
	}));
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$shared/lib/utils';

	let {
		tone = 'primary',
		size = 'md',
		label,
		class: className,
		...restProps
	}: HTMLAttributes<HTMLSpanElement> & {
		tone?: SpinnerTone;
		size?: SpinnerSize;
		/** The progress bar's accessible name; without one the spinner is decorative (a busy button names itself). */
		label?: string;
	} = $props();
</script>

<span
	role={label ? 'progressbar' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
	data-slot="spinner"
	data-size={size}
	class={cn('inline-flex items-center justify-center', toneClasses[tone], className)}
	{...restProps}
>
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-linecap="round"
		aria-hidden="true"
		focusable="false"
		class={cn('animate-spinner stroke-2', sizeClasses[size])}
	>
		{#each SPOKES as spoke (spoke.angle)}
			<line
				x1="12"
				y1="2.5"
				x2="12"
				y2="6.5"
				opacity={spoke.opacity}
				transform="rotate({spoke.angle} 12 12)"
			/>
		{/each}
	</svg>
</span>
