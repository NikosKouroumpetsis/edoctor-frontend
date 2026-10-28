<script lang="ts">
	import {
		Drawer,
		DrawerTrigger,
		DrawerContent,
		DrawerHeader,
		DrawerTitle,
		DrawerDescription
	} from './index';
	import type { DrawerDirection, DrawerSize } from './index';

	let {
		direction = 'bottom',
		size = 'md',
		dismissible = true
	}: { direction?: DrawerDirection; size?: DrawerSize; dismissible?: boolean } = $props();
</script>

<Drawer>
	<DrawerTrigger>Open drawer</DrawerTrigger>
	<DrawerContent {direction} {size} {dismissible}>
		<DrawerHeader>
			<DrawerTitle>Filters</DrawerTitle>
			<DrawerDescription>Narrow down the doctor search.</DrawerDescription>
		</DrawerHeader>
		<p>Drawer body</p>
	</DrawerContent>
</Drawer>
