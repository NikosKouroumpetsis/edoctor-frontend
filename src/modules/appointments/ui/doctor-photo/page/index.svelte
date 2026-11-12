<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Avatar, AvatarFallback, AvatarImage } from '$shared/ui/primitives/avatar';
	import { MediaPlaceholder } from '$shared/ui/primitives/media-placeholder';
	import type { DoctorPhotoProps } from '../types';

	let { photo, class: className, testId }: DoctorPhotoProps = $props();
</script>

<!-- 🔴 D-W4-68 (live check w4-live-web): the doctor's photo of screens 50–54 in the kit's own `Avatar`, as every doctor's
     card of the site — a photo that does not load (or a doctor without one) gives way to the one silhouette (S-32.8,
     S-32.13), never the browser's broken image nor its `alt` written out. The box keeps the prototype's 8 corner; the
     caller gives its size. -->
<Avatar class={cn('rounded-sm', className)} data-testid={testId}>
	{#if photo}
		<AvatarImage src={photo.src} alt={photo.alt} loading="lazy" />
	{/if}
	<AvatarFallback class="rounded-none">
		<MediaPlaceholder class="h-full" />
	</AvatarFallback>
</Avatar>
