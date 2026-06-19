<script lang="ts">
	import { CalendarDate, DateFormatter, getLocalTimeZone } from '@internationalized/date';
	import SearchIcon from '~icons/lucide/search';
	import StethoscopeIcon from '~icons/lucide/stethoscope';
	import MapPinIcon from '~icons/lucide/map-pin';
	import CalendarIcon from '~icons/lucide/calendar';
	import { cn } from '$shared/lib/utils';
	import { Button, buttonVariants } from '$shared/ui/primitives/button';
	import { Input } from '$shared/ui/primitives/input';
	import { Popover, PopoverTrigger, PopoverContent } from '$shared/ui/primitives/popover';
	import {
		Command,
		CommandInput,
		CommandList,
		CommandEmpty,
		CommandItem
	} from '$shared/ui/primitives/command';
	import { Calendar } from '$shared/ui/primitives/calendar';
	import type { DoctorSearchQuery } from '$modules/doctors/types';

	let {
		specialties = [
			'Cardiology',
			'Dermatology',
			'Neurology',
			'Orthopaedics',
			'Paediatrics',
			'Dentistry'
		],
		onSearch,
		class: className
	}: {
		specialties?: string[];
		onSearch?: (query: DoctorSearchQuery) => void;
		class?: string;
	} = $props();

	let specialty = $state('');
	let location = $state('');
	let date = $state<CalendarDate>();
	let specialtyOpen = $state(false);
	let dateOpen = $state(false);

	const dateFmt = new DateFormatter('en-GB', { dateStyle: 'medium' });
	const dateLabel = $derived(date ? dateFmt.format(date.toDate(getLocalTimeZone())) : 'Any date');
</script>

<div
	data-slot="doctor-search-bar"
	class={cn(
		'flex w-full flex-col gap-2 rounded-panel border border-border bg-card p-2 shadow-raised md:flex-row md:items-center',
		className
	)}
>
	<Popover bind:open={specialtyOpen}>
		<PopoverTrigger
			class={cn(
				buttonVariants({ variant: 'ghost' }),
				'h-12 flex-1 justify-start gap-2 font-normal'
			)}
		>
			<StethoscopeIcon class="size-4 text-muted-foreground" />
			<span class={cn(!specialty && 'text-muted-foreground')}>{specialty || 'Specialty'}</span>
		</PopoverTrigger>
		<PopoverContent class="w-64 p-0">
			<Command>
				<CommandInput placeholder="Search specialty…" aria-label="Search specialty" />
				<CommandList>
					<CommandEmpty>No specialty found.</CommandEmpty>
					{#each specialties as item (item)}
						<CommandItem
							value={item}
							onSelect={(v) => {
								specialty = v;
								specialtyOpen = false;
							}}
						>
							{item}
						</CommandItem>
					{/each}
				</CommandList>
			</Command>
		</PopoverContent>
	</Popover>

	<div class="hidden h-8 w-px bg-border md:block"></div>

	<div class="flex h-12 flex-1 items-center gap-2 px-3">
		<MapPinIcon class="size-4 shrink-0 text-muted-foreground" />
		<Input
			bind:value={location}
			placeholder="Location"
			aria-label="Location"
			class="h-auto border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
		/>
	</div>

	<div class="hidden h-8 w-px bg-border md:block"></div>

	<Popover bind:open={dateOpen}>
		<PopoverTrigger
			class={cn(
				buttonVariants({ variant: 'ghost' }),
				'h-12 flex-1 justify-start gap-2 font-normal'
			)}
		>
			<CalendarIcon class="size-4 text-muted-foreground" />
			<span class={cn(!date && 'text-muted-foreground')}>{dateLabel}</span>
		</PopoverTrigger>
		<PopoverContent class="w-auto p-0">
			<Calendar bind:value={date} locale="en-GB" onValueChange={() => (dateOpen = false)} />
		</PopoverContent>
	</Popover>

	<Button class="h-12 gap-2 md:w-auto" onclick={() => onSearch?.({ specialty, location, date })}>
		<SearchIcon class="size-4" />
		Search
	</Button>
</div>
