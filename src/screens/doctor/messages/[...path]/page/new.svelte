<script lang="ts">
	import Inbox from '$modules/messages/ui/inbox';
	import type { DoctorConversationTarget, MessagesLinks } from '$modules/messages/types';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { useDoctorMessagesNew } from '../hooks';

	let {
		locale,
		links,
		target,
		cardHref
	}: {
		locale: SupportedLocale;
		links: MessagesLinks;
		target: DoctorConversationTarget;
		cardHref: string;
	} = $props();

	const fresh = useDoctorMessagesNew({ target: () => target, cardHref: () => cardHref });
</script>

<!-- 🔴 U-193.1 (D-W51-87): the doctor writes first — the list beside it from 950, the conversation not started yet. -->
<Inbox {locale} {links} side="doctor" fresh={fresh.patient} />
