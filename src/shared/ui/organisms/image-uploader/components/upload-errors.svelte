<!--
  Upload dialog · validation banner (decision A3).

  The screenshots show no rejection UI and the repo has no toast system, so
  rejected files and count violations surface as an inline, additive banner
  using the destructive tokens. Count violations also gate the primary button
  (see the controller's `canUpload`).
-->
<script lang="ts">
	import { getImageUploaderContext } from '../lib/context';
	import { issueMessage } from '../lib/validators';

	const ctx = getImageUploaderContext();
</script>

{#if ctx.rejected.length > 0 || ctx.countIssue}
	<div
		data-slot="upload-errors"
		role="alert"
		class="mt-gutter space-y-1 rounded-control border border-destructive/40 bg-destructive/10 p-3 text-body-sm text-destructive"
	>
		{#if ctx.countIssue}
			<p>{issueMessage(ctx.countIssue)}</p>
		{/if}
		{#each ctx.rejected as rejected (rejected.file.name + rejected.file.size)}
			<p>
				<span class="font-medium">{rejected.file.name}</span> — {issueMessage(rejected.issues[0])}
			</p>
		{/each}
	</div>
{/if}
