<script lang="ts" module>
	import type { IoniconName } from '$shared/ui/icons/ionicon';

	export type NavLink = { label: string; href: string };
	export type NavMenuItem = { label: string; onSelect?: () => void; destructive?: boolean };

	// A navigation link: a 48 target with the label of a ghost button.
	const navLinkClass =
		'inline-flex min-h-touch min-w-touch items-center justify-center rounded-md px-3 text-body-sm font-medium text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50';
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Avatar, AvatarImage, AvatarFallback } from '$shared/ui/primitives/avatar';
	import {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuLabel,
		DropdownMenuItem,
		DropdownMenuSeparator
	} from '$shared/ui/primitives/dropdown-menu';
	import {
		Sheet,
		SheetTrigger,
		SheetContent,
		SheetHeader,
		SheetTitle
	} from '$shared/ui/primitives/sheet';

	let {
		brand,
		brandHref,
		brandIcon,
		links,
		primaryNavLabel,
		mobileNavLabel,
		openMenuLabel,
		closeMenuLabel,
		userName,
		accountMenuLabel,
		menuItems = [],
		actions,
		class: className
	}: {
		/** Every word and href comes from the caller (U-03.8), already localized and resolved. */
		brand: string;
		brandHref: string;
		brandIcon?: IoniconName;
		links: NavLink[];
		primaryNavLabel: string;
		mobileNavLabel: string;
		openMenuLabel: string;
		closeMenuLabel: string;
		/** The signed-in person; without one there is no account menu. */
		userName?: string;
		accountMenuLabel?: string;
		menuItems?: NavMenuItem[];
		/** Controls shown beside the menu and inside the mobile sheet (language, theme). */
		actions?: Snippet;
		class?: string;
	} = $props();

	const initials = $derived(
		(userName ?? '')
			.split(' ')
			.map((part) => part[0])
			.slice(0, 2)
			.join('')
	);
</script>

<header data-slot="site-navbar" class={cn('w-full border-b border-border bg-card', className)}>
	<div class="container-page flex h-bar-top items-center justify-between gap-4">
		<a
			href={brandHref}
			class="flex min-h-touch min-w-touch items-center gap-2 rounded-md font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
		>
			{#if brandIcon}<Ionicon name={brandIcon} class="icon-md text-primary" />{/if}
			{brand}
		</a>

		<nav class="hidden items-center gap-touch-gap laptop:flex" aria-label={primaryNavLabel}>
			{#each links as link (link.href)}
				<a href={link.href} class={navLinkClass}>{link.label}</a>
			{/each}
		</nav>

		<div class="flex items-center gap-2">
			{#if actions}
				<div class="hidden items-center gap-2 tablet:flex">{@render actions()}</div>
			{/if}

			{#if userName}
				<DropdownMenu>
					<DropdownMenuTrigger
						aria-label={accountMenuLabel}
						class="rounded-full focus-visible:ring-3 focus-visible:ring-ring/50"
					>
						<Avatar size="md">
							<AvatarImage src="" alt={userName} />
							<AvatarFallback class="text-body-sm font-normal">{initials}</AvatarFallback>
						</Avatar>
					</DropdownMenuTrigger>
					<DropdownMenuContent class="w-popover-sm" align="end">
						<DropdownMenuLabel>{userName}</DropdownMenuLabel>
						<DropdownMenuSeparator />
						{#each menuItems as item (item.label)}
							<DropdownMenuItem
								variant={item.destructive ? 'destructive' : 'default'}
								onclick={() => item.onSelect?.()}>{item.label}</DropdownMenuItem
							>
						{/each}
					</DropdownMenuContent>
				</DropdownMenu>
			{/if}

			<Sheet>
				<SheetTrigger
					class="inline-flex size-touch items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 laptop:hidden"
					aria-label={openMenuLabel}
				>
					<Ionicon name="menu" class="icon-lg text-foreground" />
				</SheetTrigger>
				<SheetContent side="right" closeLabel={closeMenuLabel}>
					<SheetHeader>
						<SheetTitle>{brand}</SheetTitle>
					</SheetHeader>
					<nav class="flex flex-col gap-touch-gap" aria-label={mobileNavLabel}>
						{#each links as link (link.href)}
							<a href={link.href} class={cn(navLinkClass, 'justify-start')}>{link.label}</a>
						{/each}
					</nav>
					{#if actions}
						<div class="mt-4 flex items-center gap-2">{@render actions()}</div>
					{/if}
				</SheetContent>
			</Sheet>
		</div>
	</div>
</header>
