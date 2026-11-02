<script lang="ts">
	import { RichText } from '$shared/ui/molecules/rich-text';
	import { AccordionDetails } from '$shared/ui/primitives/accordion';
	import type { FaqQuestion } from '$modules/help/lib/faq';

	let {
		question,
		eyebrow,
		open = false,
		lang,
		highlight,
		internalHref,
		onToggle
	}: {
		question: FaqQuestion;
		/** A search result's topic over its question. */
		eyebrow?: string;
		open?: boolean;
		/** `el` when the page speaks another language (the CMS's fallback, U-60.1 Π7). */
		lang?: string;
		/** A search result's folded words, bold in the question and in its answer (U-60.1 Π4). */
		highlight?: readonly string[];
		internalHref: (path: string) => string;
		onToggle: (id: string, open: boolean) => void;
	} = $props();
</script>

<!-- 🔴 U-60.1 (the prototype 08, Π3): one question of the FAQ — the kit's accordion (several open at once, 220 ms,
     U-12), its anchor the question's own (`#cancellation`), the question an `h3` (17/600), the answer 16/26 muted with
     36 of room on the right (under the question, not under the chevron). In the server's page; opens without JS. -->
<AccordionDetails
	id={question.id}
	summary={question.question}
	summaryAs="h3"
	summaryClass="text-title-xs"
	{eyebrow}
	{highlight}
	{open}
	onToggle={(next) => onToggle(question.id, next)}
	class="scroll-mt-card-sticky-top"
	testId="help-question"
>
	<RichText
		blocks={question.answer}
		variant="answer"
		{internalHref}
		{lang}
		{highlight}
		class="pr-indent pb-1"
	/>
</AccordionDetails>
