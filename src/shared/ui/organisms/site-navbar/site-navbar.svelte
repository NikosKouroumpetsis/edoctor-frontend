<script lang="ts" module>
	export type NavLink = { label: string; href: string };
</script>

<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import MenuIcon from '~icons/lucide/menu';
	import StethoscopeIcon from '~icons/lucide/stethoscope';
	import { cn } from '$shared/lib/utils';
	import { buttonVariants } from '$shared/ui/primitives/button';
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
	import ThemeToggle from '$shared/ui/molecules/theme-toggle';
	import LanguageSwitcher from '$shared/ui/molecules/language-switcher';

	let {
		brand = 'eDoctor',
		links = [
			{ label: 'Doctors', href: '/doctors' },
			{ label: 'Clinics', href: '/clinics' },
			{ label: 'Plans', href: '/plans' }
		],
		userName = 'Maria Alexiou',
		class: className
	}: {
		brand?: string;
		links?: NavLink[];
		userName?: string;
		class?: string;
	} = $props();

	const initials = $derived(
		userName
			.split(' ')
			.map((p) => p[0])
			.slice(0, 2)
			.join('')
	);

	// Resolve internal hrefs through SvelteKit's router helper (project convention).
	const href = (path: string) => resolve(path as Pathname);
</script>

<header data-slot="site-navbar" class={cn('w-full border-b border-border bg-card', className)}>
	<div class="container-page flex h-bar-top items-center justify-between gap-4">
		<a href={href('/')} class="flex min-h-touch min-w-touch items-center gap-2 font-semibold">
			<StethoscopeIcon class="size-5 text-primary" />
			{brand}
		</a>

		<nav class="hidden items-center gap-touch-gap laptop:flex" aria-label="Primary">
			{#each links as link (link.label)}
				<a href={href(link.href)} class={cn(buttonVariants({ variant: 'ghost' }))}>
					{link.label}
				</a>
			{/each}
		</nav>

		<div class="flex items-center gap-2">
			<div class="hidden items-center gap-2 tablet:flex">
				<LanguageSwitcher />
				<ThemeToggle />
			</div>

			<DropdownMenu>
				<DropdownMenuTrigger
					aria-label="Account menu"
					class="rounded-full focus-visible:ring-3 focus-visible:ring-ring/50"
				>
					<Avatar>
						<AvatarImage src="" alt={userName} />
						<AvatarFallback>{initials}</AvatarFallback>
					</Avatar>
				</DropdownMenuTrigger>
				<DropdownMenuContent class="w-popover-sm" align="end">
					<DropdownMenuLabel>{userName}</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem>Profile</DropdownMenuItem>
					<DropdownMenuItem>Appointments</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem variant="destructive">Sign out</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<Sheet>
				<SheetTrigger
					class={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'laptop:hidden')}
					aria-label="Open menu"
				>
					<MenuIcon />
				</SheetTrigger>
				<SheetContent side="right">
					<SheetHeader>
						<SheetTitle>{brand}</SheetTitle>
					</SheetHeader>
					<nav class="flex flex-col gap-touch-gap" aria-label="Mobile">
						{#each links as link (link.label)}
							<a
								href={href(link.href)}
								class={cn(buttonVariants({ variant: 'ghost' }), 'justify-start')}
							>
								{link.label}
							</a>
						{/each}
					</nav>
					<div class="mt-4 flex items-center gap-2">
						<LanguageSwitcher />
						<ThemeToggle />
					</div>
				</SheetContent>
			</Sheet>
		</div>
	</div>
</header>
