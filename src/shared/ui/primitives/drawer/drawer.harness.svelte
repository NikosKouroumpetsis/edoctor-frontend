<script lang="ts">
	import {
		Drawer,
		DrawerTrigger,
		DrawerContent,
		DrawerHeader,
		DrawerTitle,
		DrawerDescription
	} from './index';
	import type { DrawerDirection } from './index';

	let { direction = 'bottom' }: { direction?: DrawerDirection } = $props();
</script>

<Drawer>
	<DrawerTrigger>Open drawer</DrawerTrigger>
	<DrawerContent {direction}>
		<DrawerHeader>
			<DrawerTitle>Filters</DrawerTitle>
			<DrawerDescription>Narrow down the doctor search.</DrawerDescription>
		</DrawerHeader>
		<p>Drawer body</p>
	</DrawerContent>
</Drawer>
