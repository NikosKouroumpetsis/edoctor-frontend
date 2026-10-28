<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { IconButton } from '$shared/ui/primitives/icon-button';

	let {
		title,
		closeLabel,
		onClose,
		titleId,
		closeElevated = false,
		closeTestId,
		class: className
	}: {
		title: string;
		/** The «×» name, already localized. */
		closeLabel: string;
		onClose: () => void;
		/** The heading's id, so the dialog around it is named by it (`aria-labelledby`). */
		titleId?: string;
		/** The lifted «×» of the search modals (the application's `shadowStyle`, here `shadow-floating`). */
		closeElevated?: boolean;
		closeTestId?: string;
		class?: string;
	} = $props();
</script>

<!-- The search modals' header (`molecules/modal-header`): the title takes the width between an equal blank and the
     outline «×», wrapping rather than running under it; `pt-4` is the application's `topInset + step(4)` on a page
     whose top inset is the browser's. -->
<div data-slot="modal-header" class={cn('px-5 pt-4 pb-5', className)}>
	<div class="flex min-h-touch flex-row items-center gap-3">
		<span class="size-touch shrink-0" aria-hidden="true" data-slot="modal-header-balance"></span>
		<h2 id={titleId} class="flex-1 text-center text-title-xs font-semibold text-foreground">
			{title}
		</h2>
		<IconButton
			icon="close"
			appearance="outline"
			aria-label={closeLabel}
			elevated={closeElevated}
			data-testid={closeTestId}
			onclick={onClose}
		/>
	</div>
</div>
