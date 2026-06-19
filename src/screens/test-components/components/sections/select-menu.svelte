<script lang="ts">
	import { buttonVariants } from '$shared/ui/primitives/button';
	import {
		Select,
		SelectTrigger,
		SelectValue,
		SelectContent,
		SelectGroup,
		SelectLabel,
		SelectItem,
		SelectSeparator
	} from '$shared/ui/primitives/select';
	import {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuLabel,
		DropdownMenuItem,
		DropdownMenuCheckboxItem,
		DropdownMenuRadioGroup,
		DropdownMenuRadioItem,
		DropdownMenuSeparator,
		DropdownMenuShortcut
	} from '$shared/ui/primitives/dropdown-menu';
	import DemoSection from '../demo-section.svelte';
	import DemoRow from '../demo-row.svelte';

	let specialty = $state<string>();
	let showAvailability = $state(true);
	let sort = $state('rating');
</script>

<DemoSection
	id="select-menu"
	title="Select · Dropdown menu"
	description="In-house listbox & menu (keyboard, typeahead, positioning) — rewritten without Bits UI."
>
	<DemoRow label="Select (value: {specialty ?? 'none'})">
		<Select bind:value={specialty}>
			<SelectTrigger class="w-56" aria-label="Specialty">
				<SelectValue placeholder="Choose a specialty" />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					<SelectLabel>Common</SelectLabel>
					<SelectItem value="cardio">Cardiology</SelectItem>
					<SelectItem value="derma">Dermatology</SelectItem>
					<SelectItem value="neuro">Neurology</SelectItem>
				</SelectGroup>
				<SelectSeparator />
				<SelectGroup>
					<SelectLabel>Other</SelectLabel>
					<SelectItem value="ortho">Orthopaedics</SelectItem>
					<SelectItem value="pedia">Paediatrics</SelectItem>
				</SelectGroup>
			</SelectContent>
		</Select>
	</DemoRow>

	<DemoRow label="Dropdown menu (sort: {sort}, availability: {showAvailability})">
		<DropdownMenu>
			<DropdownMenuTrigger class={buttonVariants({ variant: 'outline' })}
				>Options</DropdownMenuTrigger
			>
			<DropdownMenuContent class="w-56">
				<DropdownMenuLabel>Filters</DropdownMenuLabel>
				<DropdownMenuCheckboxItem bind:checked={showAvailability}>
					Available today
				</DropdownMenuCheckboxItem>
				<DropdownMenuSeparator />
				<DropdownMenuLabel>Sort by</DropdownMenuLabel>
				<DropdownMenuRadioGroup bind:value={sort}>
					<DropdownMenuRadioItem value="rating">Rating</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="distance">Distance</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="price">Price</DropdownMenuRadioItem>
				</DropdownMenuRadioGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem variant="destructive">
					Reset filters
					<DropdownMenuShortcut>⌘R</DropdownMenuShortcut>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	</DemoRow>
</DemoSection>
