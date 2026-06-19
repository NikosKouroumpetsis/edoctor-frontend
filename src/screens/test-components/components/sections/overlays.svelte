<script lang="ts">
	import { buttonVariants } from '$shared/ui/primitives/button';
	import {
		Dialog,
		DialogTrigger,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription,
		DialogFooter,
		DialogClose
	} from '$shared/ui/primitives/dialog';
	import {
		Sheet,
		SheetTrigger,
		SheetContent,
		SheetHeader,
		SheetTitle,
		SheetDescription
	} from '$shared/ui/primitives/sheet';
	import { Popover, PopoverTrigger, PopoverContent } from '$shared/ui/primitives/popover';
	import { Tooltip, TooltipTrigger, TooltipContent } from '$shared/ui/primitives/tooltip';
	import { HoverCard, HoverCardTrigger, HoverCardContent } from '$shared/ui/primitives/hover-card';
	import { Input } from '$shared/ui/primitives/input';
	import { Label } from '$shared/ui/primitives/label';
	import InfoIcon from '~icons/lucide/info';
	import DemoSection from '../demo-section.svelte';
	import DemoRow from '../demo-row.svelte';
</script>

<DemoSection
	id="overlays"
	title="Dialog · Sheet · Popover · Tooltip · Hover card"
	description="Floating & modal layers on the in-house headless engine (focus trap, dismiss, scroll lock, positioning)."
>
	<DemoRow label="Dialog (modal)">
		<Dialog>
			<DialogTrigger class={buttonVariants()}>Book appointment</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Confirm booking</DialogTitle>
					<DialogDescription>Confirm your appointment with Dr. Alexiou.</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose class={buttonVariants({ variant: 'outline' })}>Cancel</DialogClose>
					<DialogClose class={buttonVariants()}>Confirm</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	</DemoRow>

	<DemoRow label="Sheet (sides)">
		{#each ['left', 'right', 'top', 'bottom'] as const as side (side)}
			<Sheet>
				<SheetTrigger class={buttonVariants({ variant: 'outline' })}>{side}</SheetTrigger>
				<SheetContent {side}>
					<SheetHeader>
						<SheetTitle>Filters</SheetTitle>
						<SheetDescription>Refine your search ({side}).</SheetDescription>
					</SheetHeader>
				</SheetContent>
			</Sheet>
		{/each}
	</DemoRow>

	<DemoRow label="Popover">
		<Popover>
			<PopoverTrigger class={buttonVariants({ variant: 'outline' })}>Open popover</PopoverTrigger>
			<PopoverContent>
				<div class="grid gap-2">
					<p class="text-title-sm">Dimensions</p>
					<Label for="w">Width</Label>
					<Input id="w" value="320px" />
				</div>
			</PopoverContent>
		</Popover>
	</DemoRow>

	<DemoRow label="Tooltip">
		<Tooltip>
			<TooltipTrigger class={buttonVariants({ variant: 'ghost', size: 'icon' })} aria-label="Info">
				<InfoIcon />
			</TooltipTrigger>
			<TooltipContent>Average wait time: 10 minutes</TooltipContent>
		</Tooltip>
	</DemoRow>

	<DemoRow label="Hover card">
		<HoverCard>
			<HoverCardTrigger href="#overlays" class="text-primary underline-offset-4 hover:underline">
				@maria.alexiou
			</HoverCardTrigger>
			<HoverCardContent>
				<p class="text-title-sm">Dr. Maria Alexiou</p>
				<p class="text-body-sm text-muted-foreground">Cardiologist · Athens · 4.9★</p>
			</HoverCardContent>
		</HoverCard>
	</DemoRow>
</DemoSection>
