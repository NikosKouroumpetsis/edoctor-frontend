<script lang="ts">
	import { Avatar, AvatarImage, AvatarFallback, type AvatarSize } from './index';

	let { src, size }: { src?: string; size?: AvatarSize } = $props();
</script>

<Avatar {size}>
	<AvatarImage {src} alt="Jane Doe" />
	<AvatarFallback>JD</AvatarFallback>
</Avatar>
