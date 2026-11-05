<script lang="ts">
	import { countCodePoints } from '$shared/lib/text';
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';

	let {
		value = $bindable(''),
		placeholder,
		sendLabel,
		max,
		countFrom,
		counterLabel,
		overLabel,
		error,
		enterSends = false,
		sending = false,
		onSend,
		onInput,
		ref = $bindable(null),
		class: className,
		testId
	}: {
		/** 🔴 The words live with the caller, in its memory: this field never stores them. */
		value?: string;
		placeholder: string;
		sendLabel: string;
		/** The most it sends, in code points, as the server counts. */
		max: number;
		/** The counter shows from here. */
		countFrom: number;
		/** The counter's words, already localized («1.960 / 2.000»). */
		counterLabel: (count: number, max: number) => string;
		/** The line while there are too many words. */
		overLabel: string;
		/** The line of a refusal; the words stay in the field. */
		error?: string | null;
		/** From 744 Enter sends and ⇧Enter is a new line; below it Enter is a new line, as on the application's keyboard. */
		enterSends?: boolean;
		sending?: boolean;
		onSend: () => void;
		/** The person wrote: a refusal's line has had its say. */
		onInput?: () => void;
		ref?: HTMLTextAreaElement | null;
		class?: string;
		testId?: string;
	} = $props();

	const count = $derived(countCodePoints(value));
	const over = $derived(count > max);
	const canSend = $derived(value.trim().length > 0 && !over && !sending);
	const line = $derived(over ? overLabel : (error ?? null));

	function send() {
		if (canSend) onSend();
	}

	function onkeydown(event: KeyboardEvent) {
		if (!enterSends || event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
		event.preventDefault();
		send();
	}
</script>

<!-- U-84 Π2: the pill that grows and then scrolls, «↑» inside it, off while there is nothing to send; the counter from
     `countFrom`, red past `max` (the browser's own stop stays far above it, so the counter can say so). A refusal's line
     under it, and the words stay. 🔴 U-81.2: below 744 the application's `ThreadComposer`: 48 (+ its rim), corner 24, «↑»
     32 / 16, up to 288; from 744 the approved prototype: 44, «↑» 36 / 20, six lines, with the same corner 24, on the shared scale. The target
     stays 48. -->
<div data-slot="composer" data-testid={testId} class={cn('w-full', className)}>
	{#if count >= countFrom}
		<p
			aria-live="polite"
			data-slot="composer-count"
			class={cn(
				'flex justify-end pb-1 text-label-md font-normal text-muted-foreground tablet:px-2 tablet:pb-1.5',
				over && 'text-danger-text tablet:font-semibold'
			)}
		>
			{counterLabel(count, max)}
		</p>
	{/if}
	<div
		data-invalid={over || undefined}
		class={cn(
			'flex flex-row items-end rounded-xl border border-input bg-card transition-colors duration-standard ease-standard focus-within:border-ring',
			over && 'border-danger focus-within:border-danger'
		)}
	>
		<textarea
			bind:this={ref}
			bind:value
			rows={1}
			data-slot="composer-field"
			{placeholder}
			{onkeydown}
			oninput={() => onInput?.()}
			aria-label={placeholder}
			aria-invalid={over ? 'true' : undefined}
			maxlength={max * 2 + 200}
			class="block field-sizing-content max-h-menu-max-h min-h-touch min-w-touch flex-1 resize-none overflow-y-auto bg-transparent py-3 pr-1 pl-4 text-body-lg text-foreground outline-none placeholder:text-muted-foreground tablet:max-h-composer tablet:min-h-composer-min-h tablet:py-2.5 tablet:text-bubble"
		></textarea>
		<button
			type="button"
			aria-label={sendLabel}
			disabled={!canSend}
			onclick={send}
			data-slot="composer-send"
			class="group grid size-touch shrink-0 place-items-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 tablet:-my-0.5 tablet:-mr-0.5"
		>
			<span
				class="grid size-control-xs place-items-center rounded-full bg-primary text-primary-foreground transition-colors duration-standard ease-standard group-active:scale-92 group-disabled:bg-foreground/8 group-disabled:text-muted-foreground tablet:size-composer-send tablet:group-disabled:bg-foreground/6"
			>
				<Ionicon name="arrow-up" class="icon-sm tablet:icon-md" />
			</span>
		</button>
	</div>
	{#if line}
		<p
			role="alert"
			data-slot="composer-line"
			class="flex flex-row items-start gap-1.5 px-2 pt-1.5 text-label-lg font-normal text-danger-text"
		>
			<Ionicon name="alert-circle" class="mt-px icon-sm shrink-0" />
			<span>{line}</span>
		</p>
	{/if}
</div>
