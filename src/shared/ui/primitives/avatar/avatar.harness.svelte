<script lang="ts">
	import { Avatar, AvatarImage, AvatarFallback } from './index';

	let { src }: { src?: string } = $props();
</script>

<Avatar>
	<AvatarImage {src} alt="Jane Doe" />
	<AvatarFallback>JD</AvatarFallback>
</Avatar>
