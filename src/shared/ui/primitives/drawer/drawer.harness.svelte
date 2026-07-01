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
		size = 'default'
	}: { direction?: DrawerDirection; size?: DrawerSize } = $props();
</script>

<Drawer>
	<DrawerTrigger>Open drawer</DrawerTrigger>
	<DrawerContent {direction} {size}>
		<DrawerHeader>
			<DrawerTitle>Filters</DrawerTitle>
			<DrawerDescription>Narrow down the doctor search.</DrawerDescription>
		</DrawerHeader>
		<p>Drawer body</p>
	</DrawerContent>
</Drawer>
