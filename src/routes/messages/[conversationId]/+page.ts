import { error } from '@sveltejs/kit';
import { isConversationId } from '$modules/messages/lib/paths';
import type { PageLoad } from './$types';

/** 🔴 U-65.6: the address's conversation is checked here, at the boundary; anything but an id is no page. */
export const load: PageLoad = ({ params }) => {
	if (!isConversationId(params.conversationId)) error(404);
	return { conversationId: params.conversationId };
};
