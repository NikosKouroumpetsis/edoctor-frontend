<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import {
		Command,
		CommandInput,
		CommandList,
		CommandEmpty,
		CommandGroup,
		CommandItem
	} from '$shared/ui/primitives/command';
	import { Popover, PopoverTrigger, PopoverContent } from '$shared/ui/primitives/popover';
	import { buttonVariants } from '$shared/ui/primitives/button';

	const { Story } = defineMeta({
		title: 'Primitives/Command',
		component: Command,
		tags: ['autodocs']
	});

	const specialties = ['Cardiology', 'Dermatology', 'Neurology', 'Pediatrics', 'Radiology'];
</script>

<script lang="ts">
	let selected = $state('');
</script>

<Story name="Default (filter)">
	{#snippet template()}
		<Command class="w-72 rounded-lg border">
			<CommandInput placeholder="Search specialty…" aria-label="Search specialty" />
			<CommandList>
				<CommandEmpty>No results.</CommandEmpty>
				<CommandGroup>
					{#each specialties as item (item)}
						<CommandItem value={item} onSelect={(v) => (selected = v)}>{item}</CommandItem>
					{/each}
				</CommandGroup>
			</CommandList>
		</Command>
	{/snippet}
</Story>

<Story name="Empty state">
	{#snippet template()}
		<Command class="w-72 rounded-lg border">
			<CommandInput placeholder="Search…" aria-label="Search" value="zzz" />
			<CommandList>
				<CommandEmpty>No results found.</CommandEmpty>
				<CommandGroup>
					{#each specialties as item (item)}
						<CommandItem value={item}>{item}</CommandItem>
					{/each}
				</CommandGroup>
			</CommandList>
		</Command>
	{/snippet}
</Story>

<Story name="In popover (combobox recipe)">
	{#snippet template()}
		<Popover>
			<PopoverTrigger class={buttonVariants({ variant: 'outline' })}>
				{selected || 'Select specialty…'}
			</PopoverTrigger>
			<PopoverContent class="w-72 p-0">
				<Command>
					<CommandInput placeholder="Search specialty…" aria-label="Search specialty" />
					<CommandList>
						<CommandEmpty>No results.</CommandEmpty>
						<CommandGroup>
							{#each specialties as item (item)}
								<CommandItem value={item} onSelect={(v) => (selected = v)}>{item}</CommandItem>
							{/each}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	{/snippet}
</Story>
