<script lang="ts">
	import {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuCheckboxItem,
		DropdownMenuSeparator,
		DropdownMenuLabel
	} from './index';

	let {
		onProfile,
		showGrid = $bindable(false),
		withLink = false
	}: { onProfile?: () => void; showGrid?: boolean; withLink?: boolean } = $props();
</script>

<DropdownMenu>
	<DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
	<DropdownMenuContent>
		<DropdownMenuLabel>Account</DropdownMenuLabel>
		<DropdownMenuItem onclick={() => onProfile?.()}>Profile</DropdownMenuItem>
		<DropdownMenuItem icon="settings-outline">Settings</DropdownMenuItem>
		<DropdownMenuItem icon="trash-outline" variant="destructive">Delete</DropdownMenuItem>
		{#if withLink}
			<DropdownMenuItem href="#help">Help</DropdownMenuItem>
		{/if}
		<DropdownMenuSeparator />
		<DropdownMenuCheckboxItem bind:checked={showGrid}>Show grid</DropdownMenuCheckboxItem>
	</DropdownMenuContent>
</DropdownMenu>
