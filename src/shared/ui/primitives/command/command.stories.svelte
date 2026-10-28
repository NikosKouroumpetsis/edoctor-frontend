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
	import { HighlightText } from '$shared/ui/primitives/highlight-text';
	import { Popover, PopoverTrigger, PopoverContent } from '$shared/ui/primitives/popover';
	import { buttonClasses } from '$shared/ui/primitives/button';
	import { Ionicon, type IoniconName } from '$shared/ui/icons/ionicon';

	type Entry = { icon: IoniconName; label: string; value: string; shortcut?: string };

	// The application's groups (`molecules/command` stories): a heading, a glyph, the words and a shortcut.
	const groups: { heading: string; items: Entry[] }[] = [
		{
			heading: 'Προτάσεις',
			items: [
				{ icon: 'calendar-outline', label: 'Ημερολόγιο', value: 'ημερολόγιο calendar' },
				{ icon: 'search-outline', label: 'Αναζήτηση γιατρού', value: 'αναζήτηση γιατρού search' }
			]
		},
		{
			heading: 'Ρυθμίσεις',
			items: [
				{ icon: 'person-outline', label: 'Προφίλ', value: 'προφίλ profile', shortcut: '⌘P' },
				{
					icon: 'settings-outline',
					label: 'Ρυθμίσεις',
					value: 'ρυθμίσεις settings',
					shortcut: '⌘S'
				}
			]
		}
	];

	// The application's Command is a sheet opened by a button; the web's opens in a popover under it.
	const { Story } = defineMeta({
		title: 'Primitives/Command',
		component: Command,
		tags: ['autodocs']
	});
</script>

<script lang="ts">
	let query = $state('');
	let emptyQuery = $state('Πληρωμές');
</script>

{#snippet palette(search: string)}
	<CommandInput placeholder="Αναζήτηση εντολής" aria-label="Αναζήτηση εντολής" />
	<CommandList>
		<CommandEmpty>Δεν βρέθηκαν αποτελέσματα.</CommandEmpty>
		{#each groups as group (group.heading)}
			<CommandGroup heading={group.heading}>
				{#each group.items as item (item.value)}
					<CommandItem value={item.value}>
						<Ionicon name={item.icon} class="icon-md shrink-0 text-muted-foreground" />
						<HighlightText
							text={item.label}
							query={search}
							lines={1}
							class="flex-1 text-body-sm text-foreground"
						/>
						{#if item.shortcut}
							<span class="ms-auto text-body-sm tracking-widest text-muted-foreground">
								{item.shortcut}
							</span>
						{/if}
					</CommandItem>
				{/each}
			</CommandGroup>
		{/each}
	</CommandList>
{/snippet}

<Story name="Default">
	{#snippet template()}
		<div class="flex flex-col gap-3">
			<Popover>
				<PopoverTrigger class={buttonClasses()}>Άνοιγμα εντολών</PopoverTrigger>
				<PopoverContent class="w-popover-md p-0">
					<Command bind:value={query}>{@render palette(query)}</Command>
				</PopoverContent>
			</Popover>
		</div>
	{/snippet}
</Story>

<!-- A search the caller holds, opened on «Πληρωμές»: nothing matches. -->
<Story name="Empty State">
	{#snippet template()}
		<div class="flex flex-col gap-3">
			<Popover>
				<PopoverTrigger class={buttonClasses()}>Άνοιγμα εντολών</PopoverTrigger>
				<PopoverContent class="w-popover-md p-0">
					<Command bind:value={emptyQuery}>{@render palette(emptyQuery)}</Command>
				</PopoverContent>
			</Popover>
		</div>
	{/snippet}
</Story>
