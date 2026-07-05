<!--
  Empty placeholder tile (shot6) — a muted square with an image glyph, shown to
  hint how many more photos are still needed to reach the minimum count.
-->
<script lang="ts">
	import ImageIcon from '~icons/lucide/image';
	import { AspectRatio } from '$shared/ui/primitives/aspect-ratio';
</script>

<AspectRatio
	ratio={1}
	class="grid place-items-center rounded-media bg-muted"
	data-slot="photo-placeholder"
>
	<ImageIcon class="icon-xl text-muted-foreground" />
</AspectRatio>
