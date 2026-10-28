<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$shared/lib/utils';
	import {
		containerGutterClasses,
		containerWidthClasses,
		type ContainerWidth
	} from '$shared/ui/molecules/container';
	import { IconButton } from '$shared/ui/primitives/icon-button';

	let {
		title,
		navTitle,
		backLabel,
		onBack,
		backHref,
		backTestId,
		footer,
		maxWidth = 'form',
		contentClass,
		children,
		class: className,
		...restProps
	}: Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'children'> & {
		/** The page's heading above the content (`h1`). */
		title?: string;
		/** The nav bar's centred title, between «‹» and an equal blank; the heading when there is no `title`. */
		navTitle?: string;
		/** The «‹» name, already localized. */
		backLabel: string;
		onBack?: () => void;
		/** «‹» as a link to the page before (the web's history), already resolved by the caller. */
		backHref?: string;
		backTestId?: string;
		/** Pinned at the bottom edge while the content scrolls under it. */
		footer?: Snippet;
		/** The content column's cap (`containers`), the application's `maxWidth` (`form`). */
		maxWidth?: ContainerWidth;
		contentClass?: string;
		children: Snippet;
	} = $props();
</script>

<!-- The application's `GeneralScreenTemplate`: the back-nav bar, the content column capped at `maxWidth` with the
     zone's gutter, and a footer pinned outside the content. -->
<div data-slot="general-screen" class={cn('flex flex-col bg-card', className)} {...restProps}>
	<div data-slot="general-screen-nav" class="bg-card px-4 pt-3 pb-4 tablet:pt-4.5">
		<div class="flex min-h-touch flex-row items-center gap-3">
			<IconButton
				icon="chevron-back"
				appearance="tint"
				surface="subtle"
				size="sm"
				iconSize="md"
				aria-label={backLabel}
				href={backHref}
				data-testid={backTestId}
				onclick={onBack}
			/>
			{#if navTitle}
				<svelte:element
					this={title ? 'p' : 'h1'}
					data-slot="general-screen-nav-title"
					class="flex-1 text-center text-title-xs font-semibold text-foreground"
				>
					{navTitle}
				</svelte:element>
				<span class="size-touch shrink-0" aria-hidden="true" data-slot="general-screen-nav-balance"
				></span>
			{/if}
		</div>
	</div>

	<div
		data-slot="general-screen-content"
		class={cn(
			'flex-1 pt-3 pb-section tablet:pt-4.5 tablet:pb-section-lg',
			containerGutterClasses.zone
		)}
	>
		<div
			class={cn(
				'mx-auto flex w-full flex-col gap-section',
				containerWidthClasses.phone[maxWidth],
				contentClass
			)}
		>
			{#if title}
				<h1 data-slot="general-screen-title" class="text-heading-lg font-semibold text-foreground">
					{title}
				</h1>
			{/if}
			{@render children()}
		</div>
	</div>

	{#if footer}
		<div
			data-slot="general-screen-footer"
			class="sticky bottom-0 border-t border-border/60 bg-card"
		>
			<div class={cn('mx-auto w-full', containerWidthClasses.phone[maxWidth])}>
				{@render footer()}
			</div>
		</div>
	{/if}
</div>
