<script lang="ts">
	import { CalendarDate, DateFormatter, getLocalTimeZone } from '@internationalized/date';
	import { buttonVariants } from '$shared/ui/primitives/button';
	import { Popover, PopoverTrigger, PopoverContent } from '$shared/ui/primitives/popover';
	import {
		Command,
		CommandInput,
		CommandList,
		CommandEmpty,
		CommandItem
	} from '$shared/ui/primitives/command';
	import { Calendar } from '$shared/ui/primitives/calendar';
	import CheckIcon from '~icons/lucide/check';
	import CalendarIcon from '~icons/lucide/calendar';
	import DemoSection from '../demo-section.svelte';
	import DemoRow from '../demo-row.svelte';

	const cities = ['Athens', 'Thessaloniki', 'Patras', 'Heraklion', 'Larissa', 'Volos'];
	let city = $state<string>();
	let comboOpen = $state(false);

	let date = $state<CalendarDate>();
	let dateOpen = $state(false);
	const dateFmt = new DateFormatter('en-GB', { dateStyle: 'medium' });
	const dateLabel = $derived(
		date ? dateFmt.format(date.toDate(getLocalTimeZone())) : 'Pick a date'
	);
</script>

<DemoSection
	id="command-calendar"
	title="Combobox · Calendar · Date picker"
	description="Composed recipes: Popover + Command (combobox) and Popover + Calendar (date picker)."
>
	<DemoRow label="Combobox (city: {city ?? 'none'})">
		<Popover bind:open={comboOpen}>
			<PopoverTrigger class={buttonVariants({ variant: 'outline' })}>
				{city ?? 'Select city…'}
			</PopoverTrigger>
			<PopoverContent class="w-64 p-0">
				<Command>
					<CommandInput placeholder="Search city…" aria-label="Search city" />
					<CommandList>
						<CommandEmpty>No city found.</CommandEmpty>
						{#each cities as c (c)}
							<CommandItem
								value={c}
								onSelect={(v) => {
									city = v;
									comboOpen = false;
								}}
							>
								{c}
								{#if city === c}<CheckIcon class="ml-auto size-4" />{/if}
							</CommandItem>
						{/each}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	</DemoRow>

	<DemoRow label="Date picker">
		<Popover bind:open={dateOpen}>
			<PopoverTrigger class={buttonVariants({ variant: 'outline' })}>
				<CalendarIcon class="size-4" />
				{dateLabel}
			</PopoverTrigger>
			<PopoverContent class="w-auto p-0">
				<Calendar bind:value={date} locale="en-GB" onValueChange={() => (dateOpen = false)} />
			</PopoverContent>
		</Popover>
	</DemoRow>

	<DemoRow label="Calendar (inline)">
		<Calendar locale="en-GB" />
	</DemoRow>
</DemoSection>
