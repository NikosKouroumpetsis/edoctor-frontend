<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';

	/** The unfilled ring's colour: the theme's `muted` or `border` (the application's `trackColorName`). */
	export type UploadRingTrack = 'muted' | 'border';

	export type UploadRingProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		/** Determinate fill in `0..1`; ignored while `indeterminate`. */
		progress: number;
		/** Outer diameter in px, `control-sm` (40) by default. */
		size?: number;
		/** Ring thickness in px, one step (4) by default. */
		strokeWidth?: number;
		/** A quarter arc that turns instead of a fill. */
		indeterminate?: boolean;
		trackColorName?: UploadRingTrack;
	};

	const trackClasses: Record<UploadRingTrack, string> = {
		muted: 'stroke-muted',
		border: 'stroke-border'
	};

	function clamp01(value: number): number {
		if (Number.isNaN(value)) return 0;
		return Math.min(Math.max(value, 0), 1);
	}
</script>

<script lang="ts">
	import { controls, step } from '$shared/design/tokens';
	import { cn } from '$shared/lib/utils';

	let {
		progress,
		size = controls['control-sm'],
		strokeWidth = step(1),
		indeterminate = false,
		trackColorName = 'muted',
		class: className,
		...restProps
	}: UploadRingProps = $props();

	const radius = $derived((size - strokeWidth) / 2);
	const circumference = $derived(2 * Math.PI * radius);
	const ratio = $derived(indeterminate ? 0.25 : clamp01(progress));
	const centre = $derived(size / 2);
</script>

<!--
	The application's `atoms/upload-ring`: the per-photo circular progress of an upload. The arc starts at 12 o'clock;
	indeterminate, a quarter arc turns once every 900 ms (whatever the motion setting, U-12.1).
-->
<div
	role="progressbar"
	aria-valuemin={0}
	aria-valuemax={1}
	aria-valuenow={indeterminate ? undefined : clamp01(progress)}
	data-slot="upload-ring"
	data-indeterminate={indeterminate ? '' : undefined}
	class={cn('inline-flex shrink-0', className)}
	style:width={`${size}px`}
	style:height={`${size}px`}
	{...restProps}
>
	<svg
		aria-hidden="true"
		width={size}
		height={size}
		viewBox={`0 0 ${size} ${size}`}
		fill="none"
		class={cn(indeterminate && 'animate-upload-ring')}
	>
		<circle
			data-slot="upload-ring-track"
			cx={centre}
			cy={centre}
			r={radius}
			stroke-width={strokeWidth}
			class={trackClasses[trackColorName]}
		/>
		<circle
			data-slot="upload-ring-indicator"
			cx={centre}
			cy={centre}
			r={radius}
			stroke-width={strokeWidth}
			stroke-linecap="round"
			stroke-dasharray={circumference}
			stroke-dashoffset={circumference * (1 - ratio)}
			transform={`rotate(-90 ${centre} ${centre})`}
			class="stroke-primary"
		/>
	</svg>
</div>
