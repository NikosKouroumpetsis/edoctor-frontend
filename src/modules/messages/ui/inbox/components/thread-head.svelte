<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { cn } from '$shared/lib/utils';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Avatar, AvatarFallback, AvatarImage } from '$shared/ui/primitives/avatar';
	import { IconButton } from '$shared/ui/primitives/icon-button';

	let {
		locale,
		backHref,
		name,
		subtitle,
		initial,
		imageUrl = null,
		isDoctor,
		whoHref = null,
		profileHref = null,
		onWho,
		onMore
	}: {
		locale: SupportedLocale;
		/** «‹» below 950: the list. */
		backHref: string;
		name: string;
		/** The specialty of a doctor; 🔴 D-W51-86: the appointment's line of a patient (none: no second line). */
		subtitle: string;
		initial: string;
		imageUrl?: string | null;
		/** A doctor's circle in the primary, anybody else's neutral. */
		isDoctor: boolean;
		/** What the name opens: a doctor's page, or 🔴 D-W51-86 the patient's card of screen 73. */
		whoHref?: string | null;
		/** A doctor's page, also as «Προφίλ» from 744. */
		profileHref?: string | null;
		/** 🔴 `sw.js:1068-1070` `pt-back`: the name opens the card one step on, so its «‹» comes back here. */
		onWho?: (event: MouseEvent) => void;
		/** ⋯ of the conversation; none on a conversation not started yet. */
		onMore?: () => void;
	} = $props();

	const options = $derived({ locale });
</script>

{#snippet who()}
	<Avatar class="size-avatar-md" aria-hidden="true">
		{#if imageUrl}
			<AvatarImage src={imageUrl} alt="" />
		{/if}
		<AvatarFallback
			class={cn(
				'text-body-lg',
				isDoctor ? 'bg-primary/12 text-primary-text' : 'bg-foreground/8 text-foreground/80'
			)}>{initial}</AvatarFallback
		>
	</Avatar>
	<span class="grid min-w-0 grid-cols-1">
		<span class="truncate text-body-lg font-semibold text-foreground tablet:text-bubble"
			>{name}</span
		>
		{#if subtitle}
			<span
				data-testid="messages-who-line"
				class="truncate text-label-lg font-normal text-muted-foreground">{subtitle}</span
			>
		{/if}
	</span>
{/snippet}

<!-- U-84 Π2: the conversation's bar — «‹» below 950, who (their page or, on the doctor's side, the patient's card), ⋯. -->
<header
	class="sticky top-0 z-30 flex min-h-touch shrink-0 flex-row items-center gap-1 border-b border-border bg-background px-3 pb-2 tablet:top-bar-top tablet:h-row-lg tablet:gap-3 tablet:border-border/60 tablet:bg-card tablet:px-6 tablet:pb-0 split:top-0"
>
	<IconButton
		icon="chevron-back"
		appearance="tint"
		surface="soft"
		size="sm"
		iconSize="md"
		aria-label={m.messages_back({}, options)}
		href={backHref}
		data-testid="messages-back"
		class="split:hidden"
	/>
	<!-- The screen's addresses, already resolved (a module knows no route). -->
	<!-- eslint-disable svelte/no-navigation-without-resolve -->
	{#if whoHref}
		<a
			href={whoHref}
			onclick={onWho}
			data-testid="messages-who"
			class="flex min-h-touch min-w-touch flex-1 flex-row items-center gap-3 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50 can-hover:hover:bg-foreground/4"
		>
			{@render who()}
		</a>
	{:else}
		<div class="flex min-h-touch min-w-0 flex-1 flex-row items-center gap-3">
			{@render who()}
		</div>
	{/if}
	{#if profileHref}
		<a
			href={profileHref}
			data-testid="messages-profile"
			class="group hidden min-h-touch min-w-touch items-center outline-none tablet:inline-flex"
		>
			<span
				class="inline-flex h-thread-pill-h items-center rounded-full border border-input px-4 text-body-sm font-semibold whitespace-nowrap text-foreground transition-colors duration-standard ease-standard group-focus-visible:ring-3 group-focus-visible:ring-ring/50 can-hover:group-hover:bg-background"
				>{m.messages_profile({}, options)}</span
			>
		</a>
	{/if}
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
	{#if onMore}
		<IconButton
			icon="ellipsis-horizontal"
			appearance="bare"
			size="sm"
			iconSize="md"
			aria-label={m.messages_more({}, options)}
			aria-haspopup="dialog"
			data-testid="messages-menu"
			onclick={onMore}
		/>
	{/if}
</header>
