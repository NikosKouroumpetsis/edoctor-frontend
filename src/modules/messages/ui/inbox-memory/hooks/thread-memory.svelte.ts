import { SvelteMap } from 'svelte/reactivity';

/** A message that has not been stored: on its way, or it did not leave. */
export type LocalMessage = {
	clientMessageId: string;
	body: string;
	at: number;
	status: 'pending' | 'failed';
};

/**
 * 🔴 U-84, U-65.6: the words of the open conversation that the server does not have: the draft and what has not left. Only
 * in this rune of the page: never an address, a storage, a log. It outlives the conversation's own component, so a session
 * that ended mid-send loses nothing (the same person signs in again and finds the words), and it goes at a sign-out or
 * with another account (`forget`). R-10: what has not left stays with its own conversation while the person is elsewhere:
 * a send that fails after they moved on is a «Δεν στάλθηκε» there, never words lost in silence, and never in another's field.
 */
export class ThreadMemory {
	conversationId = $state<string | null>(null);
	draft = $state('');
	/** The line of a refusal under the field. */
	line = $state<string | null>(null);
	#unsent = new SvelteMap<string | null, readonly LocalMessage[]>();

	/** What has not left this conversation. */
	localOf(conversationId: string | null): readonly LocalMessage[] {
		return this.#unsent.get(conversationId) ?? [];
	}

	/** Another conversation opened: its field starts empty (U-84 Π2). */
	follow(conversationId: string | null) {
		if (conversationId === this.conversationId) return;
		this.conversationId = conversationId;
		this.draft = '';
		this.line = null;
	}

	forget() {
		this.draft = '';
		this.line = null;
		this.#unsent.clear();
	}

	#ownerOf(clientMessageId: string): string | null | undefined {
		for (const [owner, messages] of this.#unsent) {
			if (messages.some((message) => message.clientMessageId === clientMessageId)) return owner;
		}
		return undefined;
	}

	#write(owner: string | null, messages: readonly LocalMessage[]) {
		if (messages.length > 0) this.#unsent.set(owner, messages);
		else this.#unsent.delete(owner);
	}

	/** The words leave the field and show as a bubble on its way. */
	addLocal(message: LocalMessage) {
		this.#write(this.conversationId, [...this.localOf(this.conversationId), message]);
	}

	setStatus(clientMessageId: string, status: LocalMessage['status']) {
		const owner = this.#ownerOf(clientMessageId);
		if (owner === undefined) return;
		this.#write(
			owner,
			this.localOf(owner).map((message) =>
				message.clientMessageId === clientMessageId ? { ...message, status } : message
			)
		);
	}

	drop(clientMessageId: string) {
		const owner = this.#ownerOf(clientMessageId);
		if (owner === undefined) return;
		this.#write(
			owner,
			this.localOf(owner).filter((message) => message.clientMessageId !== clientMessageId)
		);
	}

	/**
	 * A refusal the words can come back from: they return to the field, as they were. If the person has written something
	 * else meanwhile their words stay, and these stay a bubble that did not leave; so too if they have moved to another
	 * conversation, whose field they never enter: neither is lost.
	 */
	takeBack(clientMessageId: string, line: string | null) {
		const owner = this.#ownerOf(clientMessageId);
		if (owner === undefined) return;
		if (owner !== this.conversationId) {
			this.setStatus(clientMessageId, 'failed');
			return;
		}
		this.line = line;
		if (this.draft.trim().length > 0) {
			this.setStatus(clientMessageId, 'failed');
			return;
		}
		const message = this.localOf(owner).find(
			(entry) => entry.clientMessageId === clientMessageId
		) as LocalMessage;
		this.draft = message.body;
		this.drop(clientMessageId);
	}
}
