<script lang="ts">
	import { buttonClasses } from '$shared/ui/primitives/button';
	import { Select } from '$shared/ui/molecules/select';
	import {
		SelectRoot,
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
	let sortBy = $state<string>();
	let showAvailability = $state(true);
	let sort = $state('rating');
</script>

<DemoSection
	id="select-menu"
	title="Select · Dropdown menu"
	description="In-house listbox & menu (keyboard, typeahead, positioning) — rewritten without Bits UI."
>
	<DemoRow label="Select (value: {specialty ?? 'none'})">
		<SelectRoot bind:value={specialty}>
			<SelectTrigger class="w-full max-w-narrow" aria-label="Specialty">
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
		</SelectRoot>
	</DemoRow>

	<DemoRow label="Select, the application's data API (value: {sortBy ?? 'none'})">
		<div class="flex w-full max-w-narrow flex-col gap-3">
			<Select
				bind:value={sortBy}
				placeholder="Sort reviews"
				aria-label="Sort reviews"
				options={[
					{ value: 'recent', label: 'Most recent' },
					{ value: 'high', label: 'Highest rated', subtitle: 'Five stars first' },
					{ value: 'low', label: 'Lowest rated' }
				]}
			/>
			<Select
				variant="pill"
				bind:value={sortBy}
				placeholder="Sort"
				aria-label="Sort (pill)"
				options={[
					{ value: 'recent', label: 'Most recent' },
					{ value: 'high', label: 'Highest rated' },
					{ value: 'low', label: 'Lowest rated' }
				]}
			/>
		</div>
	</DemoRow>

	<DemoRow label="Dropdown menu (sort: {sort}, availability: {showAvailability})">
		<DropdownMenu>
			<DropdownMenuTrigger class={buttonClasses({ tone: 'outline' })}>Options</DropdownMenuTrigger>
			<DropdownMenuContent class="w-popover-sm">
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
