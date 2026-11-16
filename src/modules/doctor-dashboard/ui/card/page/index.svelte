<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { ButtonStack, type ButtonStackAction } from '$shared/ui/molecules/button-stack';
	import { VisitCard } from '$shared/ui/molecules/visit-card';
	import type { DoctorCardAnswer, DoctorCardProps } from '../types';

	let {
		card,
		group,
		answering,
		onAnswer,
		locale,
		testIdPrefix = 'doctor-today',
		href,
		rejectHref,
		moveHref,
		selected = false,
		inPlace = false
	}: DoctorCardProps = $props();

	const options = $derived({ locale });

	/**
	 * 🔴 U-189.1 · U-190.1 · D-W51-25: only what the server's `actions` allow, the dark one last. A request: «Απόρριψη»
	 * (since step 5, D-W51-49: a link to screen 69), «Αλλαγή» (since step 6, D-W51-51: a link to screen 70) and
	 * «Επιβεβαίωση». A visit begun: «Δεν ήρθε · Ολοκληρώθηκε».
	 */
	const actionList = $derived.by((): ButtonStackAction[] => {
		const busy = answering !== null;
		const testIds: Record<DoctorCardAnswer, string> = {
			confirm: 'confirm',
			NO_SHOW: 'no-show',
			COMPLETED: 'completed',
			ARRIVED: 'arrived'
		};
		const one = (answer: DoctorCardAnswer, label: string, emphasis: boolean) => ({
			id: answer,
			label,
			emphasis,
			loading: answering === answer,
			disabled: busy && answering !== answer,
			onPress: () => onAnswer(answer),
			testId: `${testIdPrefix}-${testIds[answer]}`
		});
		const list: ButtonStackAction[] = [];
		if (card.actions.reject && rejectHref) {
			list.push({
				id: 'reject',
				label: m.doctor_today_reject({}, options),
				href: rejectHref,
				disabled: busy,
				testId: `${testIdPrefix}-reject`
			});
		}
		if (card.actions.move && moveHref) {
			list.push({
				id: 'move',
				label: m.booking_summary_change({}, options),
				href: moveHref,
				disabled: busy,
				testId: `${testIdPrefix}-move`
			});
		}
		if (card.actions.confirm) list.push(one('confirm', m.doctor_today_confirm({}, options), true));
		if (card.actions.outcomes.includes('NO_SHOW')) {
			list.push(one('NO_SHOW', m.doctor_today_no_show({}, options), false));
		}
		if (card.actions.outcomes.includes('COMPLETED')) {
			list.push(one('COMPLETED', m.doctor_today_completed({}, options), true));
		}
		return list;
	});
</script>

{#snippet stack()}
	<ButtonStack actions={actionList} testId={`${testIdPrefix}-answers`} />
{/snippet}

<!-- The doctor's card of screens 66 and 67 (D-W51-03, the shared `VisitCard`): 🔴 D-W51-36 (step 4) the whole card opens
     screen 68 (its link stretched over it, screen 50's way; the answers above it), the one open beside the list of 67
     dark-bordered from 1128. -->
<li
	data-testid={`${testIdPrefix}-card`}
	data-group={group}
	data-id={card.id}
	data-selected={selected || undefined}
>
	<VisitCard
		when={card.when}
		soon={card.soon}
		name={card.name}
		meta={card.meta}
		byline={card.byline}
		quote={card.quote}
		deadline={card.deadline}
		footnote={card.footnote}
		tag={card.tag}
		dim={card.dim}
		actions={actionList.length > 0 ? stack : undefined}
		{href}
		{selected}
		selectFrom="laptop"
		{inPlace}
	/>
</li>
