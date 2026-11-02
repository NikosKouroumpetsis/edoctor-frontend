<script lang="ts">
	import PhotoAddMore from './photo-add-more.svelte';
	import StoryHarness from './story-harness.svelte';
</script>

<!-- Tests only: the «add more» tile inside the uploader's context (the parts' story provider). -->
<StoryHarness>
	<PhotoAddMore />
</StoryHarness>
