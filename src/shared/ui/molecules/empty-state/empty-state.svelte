<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { ButtonTone } from '$shared/ui/primitives/button';

	export type EmptyStateVariant = 'plain' | 'framed';

	/**
	 * At most one way on, always with its words: the caller's press (`onActionPress`, the application's) or, on the
	 * web, a link (`actionHref`, an error page's way home). Words without either draw no button.
	 */
	export type EmptyStateAction =
		| { actionLabel: string; onActionPress: () => void; actionHref?: undefined }
		| { actionLabel: string; actionHref: string; onActionPress?: undefined }
		| { actionLabel?: undefined; onActionPress?: undefined; actionHref?: undefined };

	export type EmptyStateProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> &
		EmptyStateAction & {
			title: string;
			description?: string;
			/** A glyph or a picture above the words. */
			icon?: Snippet;
			/** The button's tone: the outline unless the caller names another (S-32.3). */
			actionTone?: ButtonTone;
			variant?: EmptyStateVariant;
			/** The title's tag: the look stays, the level is the page's (`h1` on an error page, `h2` in a list). */
			titleAs?: string;
			/** Names the column (`plain`) or the card around it (`framed`). */
			testId?: string;
		};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Button } from '$shared/ui/primitives/button';
	import { cardShellClasses } from '$shared/ui/primitives/card';

	let {
		title,
		description,
		icon,
		actionLabel,
		onActionPress,
		actionHref,
		actionTone = 'outline',
		variant = 'plain',
		titleAs = 'p',
		testId,
		class: className,
		...restProps
	}: EmptyStateProps = $props();

	const showAction = $derived(
		Boolean(actionLabel) && (typeof onActionPress === 'function' || Boolean(actionHref))
	);
</script>

<!-- The application's empty state: a title, a line, and at most one way on — the sentence-case outlined button
     (S-32.3, Airbnb's «Αφαίρεση όλων των φίλτρων»). `framed` sets the same column in the application's card with an
     8 inset (a list's empty or failed result, study M-40). -->
{#snippet column(columnTestId: string | undefined)}
	<div
		data-slot="empty-state"
		data-testid={columnTestId}
		class={cn('flex w-full flex-col items-center gap-4 px-6 py-section', className)}
		{...restProps}
	>
		{#if icon}
			<div class="flex flex-col items-center justify-center">{@render icon()}</div>
		{/if}

		<div class="flex flex-col items-center gap-2">
			<svelte:element
				this={titleAs}
				class="text-center text-title-sm font-semibold text-foreground"
			>
				{title}
			</svelte:element>
			{#if description}
				<p class="max-w-narrow text-center text-body-md text-muted-foreground">{description}</p>
			{/if}
		</div>

		{#if showAction && actionLabel}
			<Button
				label={actionLabel}
				labelCase="normal"
				radius="md"
				textClass="text-body-md"
				tone={actionTone}
				href={actionHref}
				onclick={actionHref ? undefined : () => onActionPress?.()}
			/>
		{/if}
	</div>
{/snippet}

{#if variant === 'framed'}
	<div data-slot="empty-state-card" data-testid={testId} class={cn(cardShellClasses, 'p-2')}>
		{@render column(undefined)}
	</div>
{:else}
	{@render column(testId)}
{/if}
