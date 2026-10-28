<script lang="ts">
	import { BrandGoogle } from '$shared/ui/icons/brand-google';
	import { IconButton, type IconButtonOwnShapeSize } from './index';

	let {
		busy = false,
		size,
		onclick
	}: { busy?: boolean; size?: IconButtonOwnShapeSize; onclick?: () => void } = $props();
</script>

<IconButton appearance="tile" {size} aria-label="Google" {busy} {onclick}>
	<BrandGoogle />
</IconButton>
