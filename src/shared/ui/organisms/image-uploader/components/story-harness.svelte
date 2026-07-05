<!--
  Story-only context provider.

  Every image-uploader sub-part reads `getImageUploaderContext()`, so the
  per-part stories wrap the component under test in this provider: it builds a
  controller from the passed options, publishes it through context, runs an
  optional `setup(controller)` to drive the controller into a specific state
  (open dialog, stage files, open a menu…), renders the story's children, and
  revokes previews on unmount.

  Internal to the organism — NOT exported from `index.ts`. This is not a
  `*.stories.` file, so the stories glob ignores it.
-->
<script lang="ts">
	import { onDestroy, untrack, type Snippet } from 'svelte';
	import { setImageUploaderContext } from '../lib/context';
	import {
		createImageUploader,
		type ImageUploaderController
	} from '../lib/create-image-uploader.svelte';
	import type { ImageUploaderOptions } from '../lib/types';

	let {
		children,
		setup,
		...options
	}: ImageUploaderOptions & {
		children: Snippet;
		setup?: (controller: ImageUploaderController) => void;
	} = $props();

	const controller = untrack(() => createImageUploader(options));
	setImageUploaderContext(controller);
	untrack(() => setup?.(controller));

	onDestroy(() => controller.destroy());
</script>

{@render children()}
