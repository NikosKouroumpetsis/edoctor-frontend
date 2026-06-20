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
	import { buttonVariants } from '$shared/ui/primitives/button';

	const { Story } = defineMeta({
		title: 'Primitives/Dropdown menu',
		component: DropdownMenu,
		tags: ['autodocs']
	});
</script>

<script lang="ts">
	let showGrid = $state(true);
	let showRuler = $state(false);
	let density = $state('comfortable');
</script>

<Story name="Default">
	{#snippet template()}
		<DropdownMenu>
			<DropdownMenuTrigger class={buttonVariants({ variant: 'outline' })}>
				Open menu
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuLabel>Account</DropdownMenuLabel>
				<DropdownMenuItem>Profile</DropdownMenuItem>
				<DropdownMenuItem>Settings</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem>Log out</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	{/snippet}
</Story>

<Story name="With checkbox items">
	{#snippet template()}
		<DropdownMenu>
			<DropdownMenuTrigger class={buttonVariants({ variant: 'outline' })}>View</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuLabel>Appearance</DropdownMenuLabel>
				<DropdownMenuCheckboxItem bind:checked={showGrid}>Show grid</DropdownMenuCheckboxItem>
				<DropdownMenuCheckboxItem bind:checked={showRuler}>Show ruler</DropdownMenuCheckboxItem>
			</DropdownMenuContent>
		</DropdownMenu>
	{/snippet}
</Story>

<Story name="With radio group">
	{#snippet template()}
		<DropdownMenu>
			<DropdownMenuTrigger class={buttonVariants({ variant: 'outline' })}>
				Density
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuLabel>Density</DropdownMenuLabel>
				<DropdownMenuRadioGroup bind:value={density}>
					<DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	{/snippet}
</Story>

<Story name="Destructive item">
	{#snippet template()}
		<DropdownMenu>
			<DropdownMenuTrigger class={buttonVariants({ variant: 'outline' })}>
				Manage
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem>Rename</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem variant="destructive">Delete account</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	{/snippet}
</Story>
