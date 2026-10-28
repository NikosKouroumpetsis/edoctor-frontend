<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';

	export type BadgeTone =
		| 'primary'
		| 'secondary'
		| 'accent'
		| 'muted'
		| 'success'
		| 'warning'
		| 'danger'
		| 'outline';
	export type BadgeSize = 'sm' | 'md';

	type SolidTone = Extract<BadgeTone, 'success' | 'warning' | 'danger'>;

	// The application's `Badge` (`atoms/badge`): status tones are a soft tint with their `*-text` colour.
	const toneClasses: Record<BadgeTone, string> = {
		primary: 'border-primary bg-primary',
		secondary: 'border-secondary bg-secondary',
		accent: 'border-accent bg-accent',
		muted: 'border-muted bg-muted',
		success: 'border-success/20 bg-success/15',
		warning: 'border-warning/20 bg-warning/15',
		danger: 'border-danger/20 bg-danger/15',
		outline: 'border-border bg-transparent'
	};
	const toneTextClasses: Record<BadgeTone, string> = {
		primary: 'text-primary-foreground',
		secondary: 'text-secondary-foreground',
		accent: 'text-secondary-foreground',
		muted: 'text-muted-foreground',
		success: 'text-success-text',
		warning: 'text-foreground',
		danger: 'text-danger-text',
		outline: 'text-foreground'
	};
	// Opt-in solid status tones: danger/success fill in their text colour, the label ≥ 4.5:1 (S-34.1).
	const solidClasses: Record<SolidTone, string> = {
		success: 'border-success-text bg-success-text',
		warning: 'border-warning bg-warning',
		danger: 'border-danger-text bg-danger-text'
	};
	const solidTextClasses: Record<SolidTone, string> = {
		success: 'text-success-foreground',
		warning: 'text-warning-foreground',
		danger: 'text-danger-foreground'
	};
	const sizeClasses: Record<BadgeSize, string> = {
		sm: 'px-2 py-0.5',
		md: 'px-2.5 py-1'
	};

	const isSolidTone = (tone: BadgeTone): tone is SolidTone =>
		tone === 'success' || tone === 'warning' || tone === 'danger';

	export type BadgeProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
		label: string;
		tone?: BadgeTone;
		size?: BadgeSize;
		/** A solid fill for the status tones (`success` / `warning` / `danger`); a no-op for the others. */
		solid?: boolean;
		/** Classes of the label: a text role only, never a colour. */
		textClass?: string;
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';

	let {
		label,
		tone = 'primary',
		size = 'md',
		solid = false,
		textClass,
		class: className,
		...restProps
	}: BadgeProps = $props();

	const useSolid = $derived(solid && isSolidTone(tone));
	const box = $derived(useSolid && isSolidTone(tone) ? solidClasses[tone] : toneClasses[tone]);
	const words = $derived(
		useSolid && isSolidTone(tone) ? solidTextClasses[tone] : toneTextClasses[tone]
	);
</script>

<span
	data-slot="badge"
	data-tone={tone}
	class={cn(
		'inline-flex flex-row items-center justify-center self-start rounded-full border',
		box,
		sizeClasses[size],
		className
	)}
	{...restProps}
>
	<span class={cn('text-label-md font-semibold', words, textClass)}>{label}</span>
</span>
