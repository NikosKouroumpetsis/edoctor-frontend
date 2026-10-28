<script lang="ts" module>
	// The rows' tints in order (the application's `guidanceCardToneClassNames`); a fourth row and later are muted.
	const toneClasses = [
		'border-primary/10 bg-primary/5',
		'border-accent/25 bg-accent/10',
		'border-border/70 bg-muted/70'
	] as const;
	const fallbackToneClass = 'border-border/70 bg-muted/70';

	/** The application's `GuidanceCard` props (U-14.2); its `className` is the web's `class`. */
	export type GuidanceCardProps = {
		eyebrow: string;
		title: string;
		body: string;
		rules: string[];
		class?: string;
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Card } from '$shared/ui/primitives/card';
	import { Text } from '$shared/ui/primitives/text';

	let { eyebrow, title, body, rules, class: className }: GuidanceCardProps = $props();
</script>

<!-- The application's `GuidanceCard` (U-14.2), class for class: its card with 24 between the two columns — the eyebrow
     pill on the accent tint, the heading, the body — then one tinted row per rule. Every word is the caller's (U-03.5). -->
<Card class={cn('gap-6', className)} data-component="guidance-card">
	<div class="flex flex-col gap-3">
		<div class="self-start rounded-full border border-accent/25 bg-accent/10 px-4 py-2">
			<Text class="text-body-sm text-foreground" text={eyebrow} />
		</div>
		<Text variant="heading" text={title} />
		<Text text={body} />
	</div>

	<div class="flex flex-col gap-3">
		{#each rules as rule, index (index)}
			<div class={cn('rounded-xl border px-4 py-4', toneClasses[index] ?? fallbackToneClass)}>
				<Text text={rule} />
			</div>
		{/each}
	</div>
</Card>
