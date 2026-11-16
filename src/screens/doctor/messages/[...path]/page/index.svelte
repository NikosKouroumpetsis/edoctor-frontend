<script lang="ts">
	import Inbox from '$modules/messages/ui/inbox';
	import { useDoctorMessagesScreen } from '../hooks';
	import type { DoctorMessagesScreenProps } from '../types';
	import New from './new.svelte';

	let { data }: DoctorMessagesScreenProps = $props();

	const screen = useDoctorMessagesScreen(() => data);
	const address = $derived(screen.address);
</script>

<!-- 🔴 Wave 5.1 · screen 74, the doctor's messages (D-W51-85 … 87; 88 §74; `sw.js:775-799` `msgList`, `msgPage`,
     `threadPage`): the 21 as it was built, inside the doctor's frame, reading ONLY the doctor's side (U-182.3) — from 950
     the list (400) and the conversation beside it, below it each alone; a conversation the doctor starts (U-193.1) in
     the conversation's place, one per patient (`#key`). -->
{#if address.view === 'new'}
	{#key `${address.target.kind}/${address.target.id}`}
		<New
			locale={screen.locale}
			links={screen.links}
			target={address.target}
			cardHref={screen.card(address.target)}
		/>
	{/key}
{:else}
	<Inbox
		locale={screen.locale}
		links={screen.links}
		side="doctor"
		conversationId={address.view === 'conversation' ? address.conversationId : null}
		archive={address.view === 'archive'}
	/>
{/if}
