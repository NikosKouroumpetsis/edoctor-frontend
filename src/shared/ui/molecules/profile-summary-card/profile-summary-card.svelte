<script lang="ts" module>
	/** One number that describes the person: a bold value (`rating`: with its star) over a muted label. */
	export type ProfileSummaryStat = {
		id: string;
		kind?: 'value' | 'rating';
		/** Formatted by the caller («4,9», «12 έτη», S-31.2). */
		value: string;
		label: string;
	};
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$shared/lib/utils';
	import { Avatar, AvatarFallback, AvatarImage } from '$shared/ui/primitives/avatar';
	import { Rating } from '$shared/ui/primitives/rating';
	import { Separator } from '$shared/ui/primitives/separator';

	let {
		name,
		role,
		initial,
		imageUrl,
		stats,
		testIdPrefix,
		class: className,
		...restProps
	}: Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'role'> & {
		name: string;
		/** What the person does, already localized. */
		role: string;
		/** The letters of the circle without a photo. */
		initial: string;
		imageUrl?: string;
		stats: readonly ProfileSummaryStat[];
		/** `<prefix>-card`, `<prefix>-stats`, `<prefix>-stat-separator` (the application's test ids). */
		testIdPrefix?: string;
	} = $props();

	const testIdOf = (part: string) => (testIdPrefix ? `${testIdPrefix}-${part}` : undefined);
</script>

<!-- The application's raised card (M-24): who someone is on the left, the numbers that describe them on the right,
     a hairline BETWEEN rows; no stats drop the column. -->
<div
	data-slot="profile-summary-card"
	data-testid={testIdOf('card')}
	class={cn(
		'flex flex-row items-center gap-4 rounded-xl border border-border/60 bg-card p-5 shadow-soft',
		className
	)}
	{...restProps}
>
	<div class="flex flex-1 flex-col items-center gap-3">
		<Avatar size="xl" role="img" aria-label={name} class="bg-muted">
			{#if imageUrl}
				<AvatarImage src={imageUrl} alt="" />
			{/if}
			<AvatarFallback aria-hidden="true" class="font-semibold">{initial}</AvatarFallback>
		</Avatar>
		<div class="flex flex-col items-center gap-1">
			<p class="text-center text-title-md font-bold text-foreground">{name}</p>
			<p class="text-center text-body-sm text-muted-foreground">{role}</p>
		</div>
	</div>

	{#if stats.length > 0}
		<!-- `min-w-0`: the column may narrow below its longest label, so `truncate` cuts it (Yoga's `minWidth: 0`). -->
		<div data-testid={testIdOf('stats')} class="flex min-w-0 flex-1 flex-col gap-3">
			{#each stats as stat, index (stat.id)}
				<div class="flex flex-col gap-3">
					{#if index > 0}
						<Separator spacing="none" data-testid={testIdOf('stat-separator')} />
					{/if}
					<div class="flex flex-col gap-0.5">
						{#if stat.kind === 'rating'}
							<Rating variant="value" label={stat.value} />
						{:else}
							<div class="flex flex-row items-center gap-1">
								<span class="text-title-md font-bold text-foreground">{stat.value}</span>
							</div>
						{/if}
						<span class="truncate text-body-sm text-muted-foreground">{stat.label}</span>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
