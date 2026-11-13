<script lang="ts">
	let { title, text, testId }: { title: string; text: string; testId: string } = $props();
</script>

<!-- A box under the rows (record §5.3, `58-personal/pers.css` `.f-note`): a thin rim and the 12 corner, its title
     15 / 600 over its line 14 muted. Words only: it leads nowhere. -->
<div data-testid={testId} class="rounded-md border border-line px-4.5 py-4">
	<h3 class="text-body-md font-semibold text-foreground">{title}</h3>
	<p class="mt-0.5 text-body-sm text-muted-foreground">{text}</p>
</div>
