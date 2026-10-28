<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuCheckboxItem,
		DropdownMenuRadioGroup,
		DropdownMenuRadioItem,
		DropdownMenuLabel,
		DropdownMenuSeparator
	} from '$shared/ui/primitives/dropdown-menu';
	import { buttonClasses } from '$shared/ui/primitives/button';

	// The application's menu (`molecules/dropdown-menu`): «Ενέργειες» with its glyphs (`icon`, R7-4), a checkbox row
	// and the destructive «Διαγραφή». It fades in and grows from 95 % (U-09.8), whatever the motion setting (U-12.1).
	const { Story } = defineMeta({
		title: 'Primitives/DropdownMenu',
		component: DropdownMenu,
		tags: ['autodocs']
	});
</script>

<script lang="ts">
	let showArchived = $state(false);
	let density = $state('comfortable');
</script>

<Story name="Playground">
	{#snippet template()}
		<DropdownMenu>
			<DropdownMenuTrigger class={buttonClasses()}>Ενέργειες</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuLabel>Λογαριασμός</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem icon="create-outline">Επεξεργασία</DropdownMenuItem>
				<DropdownMenuItem icon="share-outline">Κοινοποίηση</DropdownMenuItem>
				<DropdownMenuCheckboxItem bind:checked={showArchived}>
					Εμφάνιση αρχειοθετημένων
				</DropdownMenuCheckboxItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem icon="trash-outline" variant="destructive">Διαγραφή</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	{/snippet}
</Story>

<!-- A menu with one choice of two: the chosen one carries the dot, and the menu stays open on a press. -->
<Story name="With Radio Group">
	{#snippet template()}
		<DropdownMenu>
			<DropdownMenuTrigger class={buttonClasses()}>Πυκνότητα</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuLabel>Πυκνότητα</DropdownMenuLabel>
				<DropdownMenuRadioGroup bind:value={density}>
					<DropdownMenuRadioItem value="comfortable">Άνετη</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="compact">Συμπαγής</DropdownMenuRadioItem>
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	{/snippet}
</Story>
