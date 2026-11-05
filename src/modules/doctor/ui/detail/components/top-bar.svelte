<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { m } from '$paraglide/messages.js';
	import { cn } from '$shared/lib/utils';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { StickyTopBar } from '$shared/ui/organisms/sticky-top-bar';

	let {
		locale,
		backHref,
		onBack,
		saved,
		pop = false,
		onShare,
		onSave,
		showActions = true
	}: {
		locale: SupportedLocale;
		/** Where «‹» leads without a page behind it (the results). */
		backHref: ResolvedPathname;
		/** «‹» with a page of the site behind it goes back to it (the results with their search). */
		onBack: (event: MouseEvent) => void;
		saved: boolean;
		/** The heart has just filled: its «pop» plays. */
		pop?: boolean;
		onShare: () => void;
		onSave: () => void;
		/** No share or heart on a page that failed (only «‹»). */
		showActions?: boolean;
	} = $props();

	const options = $derived({ locale });
</script>

<!-- The phone's bar (< 744, app = web): «‹» · share · heart, opaque from the start (S-32.6; no hero under it since
     U-41.1, the prototype v2), over the page; from 744 the frame's top bar and the identity's acts take over.
     🔴 r5: the heart is an `IconButton` beside the share, in the row's flow (the application's `sticky-top-header`), never
     the photo corner's `FavoriteButton`, which is `absolute` at its parent's top-right and lay over the share. r6: the
     three glyphs are 20 (`md`, the application's `iconSize="md"`) in their 48 targets. -->
<div class="tablet:hidden" data-slot="doctor-top-bar">
	<StickyTopBar backgroundOpacity={1} class="z-30" data-testid="doctor-detail-sticky-header">
		{#snippet leading()}
			<IconButton
				icon="chevron-back"
				iconSize="md"
				href={backHref}
				aria-label={m.doctor_back({}, options)}
				data-testid="doctor-detail-back"
				onclick={onBack}
			/>
		{/snippet}
		{#snippet trailing()}
			{#if showActions}
				<IconButton
					icon="share-outline"
					iconSize="md"
					aria-label={m.doctor_share({}, options)}
					data-testid="doctor-detail-share"
					onclick={() => onShare()}
				/>
				<IconButton
					aria-label={m.doctor_favorite({}, options)}
					aria-pressed={saved}
					data-testid="doctor-detail-favorite"
					onclick={() => onSave()}
				>
					<Ionicon
						name={saved ? 'heart' : 'heart-outline'}
						class={cn(
							saved ? 'icon-md text-accent' : 'icon-md text-foreground',
							pop && 'animate-heart-pop'
						)}
					/>
				</IconButton>
			{/if}
		{/snippet}
	</StickyTopBar>
	<div aria-hidden="true" class="mb-1 h-bar-top"></div>
</div>
