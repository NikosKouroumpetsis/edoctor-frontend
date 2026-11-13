<script lang="ts">
	import type { DeletionLine } from '$modules/account/lib/deletion-flow';

	let { title, lines, testId }: { title: string; lines: DeletionLine[]; testId: string } = $props();
</script>

<!-- One titled list of the preview (`62-privacy/priv.css:16-20` `.v-sec`): the title 18 / 600, then each line 15 with
     its dot over a thin rule. A line with only a count prints it beside its words; one that explains itself (why it is
     kept, for how long) prints those under it, 13 muted. Every word is a text node (U-65.6). -->
<section data-testid={testId} class="mt-6">
	<h3 class="text-title-sm font-semibold text-foreground">{title}</h3>
	<ul class="mt-1 flex flex-col">
		{#each lines as line (line.id)}
			<li
				data-testid={`${testId}-${line.id}`}
				class="flex flex-row items-start gap-3 border-b border-line py-2 text-body-md text-foreground"
			>
				<span aria-hidden="true" class="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground"
				></span>
				<span class="grid min-w-0 flex-1 gap-0.5">
					<span>{line.text}</span>
					{#if line.detail}
						<span class="text-label-lg font-normal text-muted-foreground">{line.detail}</span>
						{#if line.meta}
							<span class="text-label-lg font-normal text-muted-foreground">{line.meta}</span>
						{/if}
					{/if}
				</span>
				{#if line.meta && !line.detail}
					<span class="shrink-0 font-semibold">{line.meta}</span>
				{/if}
			</li>
		{/each}
	</ul>
</section>
