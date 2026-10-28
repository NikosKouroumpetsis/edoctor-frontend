<script lang="ts">
	import { BottomSheet, BottomSheetTitle } from './index';

	let {
		dismissOnBackdropPress,
		scrollable,
		snapPoints,
		onDismiss
	}: {
		dismissOnBackdropPress?: boolean;
		scrollable?: boolean;
		snapPoints?: (string | number)[];
		onDismiss?: () => void;
	} = $props();

	let open = $state(false);
</script>

<button type="button" class="size-touch" onclick={() => (open = true)}>Χώρα</button>
<BottomSheet
	bind:open
	{dismissOnBackdropPress}
	{scrollable}
	{snapPoints}
	{onDismiss}
	data-testid="sheet"
>
	<div class="flex flex-col gap-4 px-5 pt-2">
		<BottomSheetTitle>Επιλογή χώρας</BottomSheetTitle>
		<button type="button" class="size-touch" onclick={() => (open = false)}>Έτοιμο</button>
	</div>
</BottomSheet>
