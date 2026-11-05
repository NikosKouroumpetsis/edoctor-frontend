<script lang="ts" module>
	/** One number that describes the person: a bold value (`rating`: with its star) over a muted label. */
	export type ProfileSummaryStat = {
		id: string;
		kind?: 'value' | 'rating';
		/** Formatted by the caller («4,9», «12 έτη», S-31.2). */
		value: string;
		label: string;
		/** The number leads somewhere (a page's own reviews, U-73 Π3). */
		href?: string;
	};
	/** `app` the application's card (M-24); `page` the card of a person's page (U-73.1 Ε3), by its own width. */
	export type ProfileSummaryLayout = 'app' | 'page';
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$shared/lib/utils';
	import { HugeiconsLaurelWreathLeft01 } from '$shared/ui/icons/hugeicons-laurel-wreath-left-01';
	import { HugeiconsLaurelWreathRight01 } from '$shared/ui/icons/hugeicons-laurel-wreath-right-01';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Avatar, AvatarFallback, AvatarImage } from '$shared/ui/primitives/avatar';
	import { Rating } from '$shared/ui/primitives/rating';
	import { Separator } from '$shared/ui/primitives/separator';

	let {
		name,
		role,
		initial,
		imageUrl,
		stats,
		badge,
		layout = 'app',
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
		/** Words between laurels under the role («Επιλογή ασθενών»), `page` only. */
		badge?: string;
		layout?: ProfileSummaryLayout;
		/** `<prefix>-card`, `<prefix>-stats`, `<prefix>-stat-separator` (the application's test ids). */
		testIdPrefix?: string;
	} = $props();

	const testIdOf = (part: string) => (testIdPrefix ? `${testIdPrefix}-${part}` : undefined);
</script>

{#if layout === 'page'}
	<!-- 🔴 U-73.1 Ε3 (screen 16 Π3, Airbnb's host card): the 24 corner and the booking card's shadow. Who someone is in the
	     middle, the numbers under them in a row of three; from 340 of its OWN width, on every phone, the numbers beside them
	     with a hairline between. CSS only, one element. -->
	<div
		data-slot="profile-summary-card"
		data-layout="page"
		data-testid={testIdOf('card')}
		class={cn(
			'@container rounded-xl bg-card shadow-raised dark:border dark:border-border',
			className
		)}
		{...restProps}
	>
		<div
			class={cn(
				'grid grid-cols-1 gap-5 px-5 py-6',
				stats.length > 0 &&
					'card-wide:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] card-wide:items-center card-wide:gap-4'
			)}
		>
			<div class="flex min-w-0 flex-col items-center text-center">
				<Avatar size="xl" role="img" aria-label={name} class="size-avatar-2xl bg-muted">
					{#if imageUrl}
						<AvatarImage src={imageUrl} alt="" />
					{/if}
					<AvatarFallback aria-hidden="true" class="font-semibold">{initial}</AvatarFallback>
				</Avatar>
				<p
					class="mt-3 text-title-md font-bold wrap-anywhere text-foreground tablet:text-heading-sm tablet:font-semibold"
				>
					{name}
				</p>
				<p class="mt-1 text-body-sm wrap-anywhere text-muted-foreground">{role}</p>
				{#if badge}
					<p
						data-testid={testIdOf('badge')}
						class="mt-2 inline-flex flex-row items-center gap-1 text-label-md font-semibold text-foreground"
					>
						<HugeiconsLaurelWreathLeft01 class="icon-sm text-rating" />
						{badge}
						<HugeiconsLaurelWreathRight01 class="icon-sm text-rating" />
					</p>
				{/if}
			</div>
			{#if stats.length > 0}
				<ul
					data-testid={testIdOf('stats')}
					class="grid auto-cols-fr grid-flow-col border-t border-border/60 pt-4 card-wide:grid-flow-row card-wide:border-t-0 card-wide:pt-0"
				>
					{#each stats as stat, index (stat.id)}
						{@const box = cn(
							'flex min-w-0 flex-col items-center gap-0.5 px-1.5 text-center card-wide:items-start card-wide:px-0 card-wide:py-3 card-wide:text-left card-wide:first:pt-0 card-wide:last:pb-0',
							index > 0 && 'border-l border-border/60 card-wide:border-t card-wide:border-l-0'
						)}
						<li class={box}>
							<span
								class="inline-flex items-center gap-0.5 text-heading-sm font-bold text-foreground tabular-nums"
							>
								{stat.value}
								{#if stat.kind === 'rating'}<Ionicon name="star" class="size-3.5" />{/if}
							</span>
							{#if stat.href}
								<a
									href={stat.href}
									data-testid={testIdOf(`stat-${stat.id}`)}
									class="-my-3 inline-flex min-h-touch min-w-touch items-center text-label-md font-medium text-foreground underline-offset-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 can-hover:hover:underline"
									>{stat.label}</a
								>
							{:else}
								<span class="text-label-md font-medium text-foreground">{stat.label}</span>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
{:else}
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
{/if}
