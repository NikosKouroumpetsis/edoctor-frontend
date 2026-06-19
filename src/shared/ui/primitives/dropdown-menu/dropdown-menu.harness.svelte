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

	let { onProfile, showGrid = $bindable(false) }: { onProfile?: () => void; showGrid?: boolean } =
		$props();
</script>

<DropdownMenu>
	<DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
	<DropdownMenuContent>
		<DropdownMenuLabel>Account</DropdownMenuLabel>
		<DropdownMenuItem onclick={() => onProfile?.()}>Profile</DropdownMenuItem>
		<DropdownMenuItem>Settings</DropdownMenuItem>
		<DropdownMenuSeparator />
		<DropdownMenuCheckboxItem bind:checked={showGrid}>Show grid</DropdownMenuCheckboxItem>
	</DropdownMenuContent>
</DropdownMenu>
