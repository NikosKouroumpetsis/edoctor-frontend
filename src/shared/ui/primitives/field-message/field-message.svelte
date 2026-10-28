<script lang="ts" module>
	export type FieldMessageProps = {
		error?: string;
		helperText?: string;
		/** The leading alert glyph of the error line (default true). */
		icon?: boolean;
		/** The id a field points its `aria-describedby` at. */
		id?: string;
		class?: string;
		'data-testid'?: string;
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';

	let {
		error,
		helperText,
		icon = true,
		id,
		class: className,
		'data-testid': testId
	}: FieldMessageProps = $props();
</script>

<!-- The line under every field (the application's `FieldMessage`): the error in `danger-text` (≥ 4.5:1, S-32.16)
     with its alert glyph, else the muted helper, else nothing. -->
{#if error}
	<p
		{id}
		data-slot="field-message"
		data-state="error"
		data-testid={testId}
		class={cn('mt-1 flex flex-row items-center gap-1', className)}
	>
		{#if icon}
			<Ionicon name="alert-circle" class="icon-sm text-danger-text" />
		{/if}
		<span aria-live="polite" class="text-body-sm text-danger-text">{error}</span>
	</p>
{:else if helperText}
	<p
		{id}
		data-slot="field-message"
		data-state="helper"
		data-testid={testId}
		class={cn('mt-1 text-body-sm text-muted-foreground', className)}
	>
		{helperText}
	</p>
{/if}
