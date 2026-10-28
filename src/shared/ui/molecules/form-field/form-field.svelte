<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	/** What the control spreads onto itself: the label's `for` target, the message and the error state. */
	export type FormFieldControl = {
		id: string;
		'aria-describedby'?: string;
		'aria-invalid'?: 'true';
	};

	export type FormFieldProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		label: string;
		/** Replaces the helper line and marks the control invalid. */
		error?: string;
		helperText?: string;
		required?: boolean;
		disabled?: boolean;
		/** The control, wired to the label and the line below it. */
		children: Snippet<[FormFieldControl]>;
	};
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { useId } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import { Label } from '$shared/ui/primitives/label';

	let {
		label,
		error,
		helperText,
		required = false,
		disabled = false,
		id,
		class: className,
		children,
		...restProps
	}: FormFieldProps = $props();

	// Generated once; `id` names the field's root and seeds the control's id.
	const baseId = useId(untrack(() => id) ?? undefined, 'form-field');
	const controlId = `${baseId}-control`;
	const messageId = `${baseId}-message`;

	const hasError = $derived(Boolean(error));
	// The application's `error ?? helperText`: an empty error shows no line, not the helper.
	const message = $derived(error ?? helperText);
	const control = $derived<FormFieldControl>({
		id: controlId,
		'aria-describedby': message ? messageId : undefined,
		'aria-invalid': hasError ? 'true' : undefined
	});
</script>

<!--
	The application's `molecules/form-field`: the label (with «*» when required), the control, then ONE plain line —
	the error in `danger-text` (polite) instead of the helper in the muted colour. No icon (that is `FieldMessage`).
-->
<div
	{id}
	data-slot="form-field"
	class={cn('flex w-full flex-col gap-1.5', className)}
	{...restProps}
>
	<Label for={controlId} {label} {required} {disabled} />

	{@render children(control)}

	{#if message}
		<p
			id={messageId}
			data-slot="form-field-message"
			data-state={hasError ? 'error' : 'helper'}
			aria-live={hasError ? 'polite' : undefined}
			class={cn('text-body-sm', hasError ? 'text-danger-text' : 'text-muted-foreground')}
		>
			{message}
		</p>
	{/if}
</div>
