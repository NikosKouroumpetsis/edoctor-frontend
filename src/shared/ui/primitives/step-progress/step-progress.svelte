<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';

	/** The segments' thickness (U-06.9): steps of the scale, `md` the application's `h-1`. */
	export type StepProgressThickness = 'sm' | 'md' | 'lg';

	export const stepProgressThicknesses: Record<StepProgressThickness, string> = {
		sm: 'h-0.5',
		md: 'h-1',
		lg: 'h-1.5'
	};

	export type StepProgressProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		/** Total number of segments. */
		steps: number;
		/** 0-based index of the step in progress. */
		currentStep: number;
		/** Fill ratio (0..1) of the current step's segment. */
		progress?: number;
		thickness?: StepProgressThickness;
	};

	function clamp01(value: number): number {
		if (Number.isNaN(value)) return 0;
		return Math.min(Math.max(value, 0), 1);
	}
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';

	let {
		steps,
		currentStep,
		progress = 0,
		thickness = 'md',
		class: className,
		...restProps
	}: StepProgressProps = $props();

	const safeSteps = $derived(Math.max(0, Math.floor(steps)));
	const current = $derived(clamp01(progress));
	const fills = $derived(
		Array.from({ length: safeSteps }, (_, index) =>
			index < currentStep ? 1 : index === currentStep ? current : 0
		)
	);
</script>

<!--
	The application's `atoms/step-progress` (the wizard chrome of Airbnb's «add photos»): finished segments full, the
	current one by `progress`, the rest the muted track; the row stretches to its container.
-->
<div
	role="progressbar"
	aria-valuemin={0}
	aria-valuemax={safeSteps}
	aria-valuenow={Math.min(currentStep + current, safeSteps)}
	data-slot="step-progress"
	class={cn('flex w-full items-center gap-1.5', className)}
	{...restProps}
>
	{#each fills as fill, index (index)}
		<div
			data-slot="step-progress-segment"
			class={cn('flex-1 overflow-hidden rounded-full bg-muted', stepProgressThicknesses[thickness])}
		>
			<div
				data-slot="step-progress-fill"
				class="h-full rounded-full bg-foreground"
				style:width={`${fill * 100}%`}
			></div>
		</div>
	{/each}
</div>
