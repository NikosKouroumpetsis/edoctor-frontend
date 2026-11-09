import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessionChannelName } from '$shared/config/env';
import { openSignOutChannel, type SignOutChannel } from './sign-out-channel';

const opened: { close: () => void }[] = [];
const open = (onSignedOut: () => void): SignOutChannel => {
	const channel = openSignOutChannel(onSignedOut);
	opened.push(channel);
	return channel;
};
const settle = () => new Promise((done) => setTimeout(done, 20));

afterEach(() => {
	for (const channel of opened.splice(0)) channel.close();
});

describe('shared/state/session · the tabs’ sign-out channel (🔴 D-W3-37, security web MINOR-2)', () => {
	it('a sign-out announced in one tab reaches the others, never the one that sent it; only the event travels', async () => {
		const here = vi.fn();
		const there = vi.fn();
		const heard: unknown[] = [];
		const listener = new BroadcastChannel(sessionChannelName);
		listener.onmessage = (event) => heard.push(event.data);
		const tabHere = open(here);
		open(there);
		tabHere.announce();
		await settle();
		expect(there).toHaveBeenCalledTimes(1);
		expect(here).not.toHaveBeenCalled();
		expect(heard).toEqual(['signed-out']);
		listener.close();
	});

	it('(negative) anything else on the channel — an object, a person’s fact, another word — is no sign-out; a closed tab hears nothing', async () => {
		const tab = vi.fn();
		const closed = vi.fn();
		open(tab);
		open(closed).close();
		const stranger = new BroadcastChannel(sessionChannelName);
		stranger.postMessage({ type: 'signed-out' });
		stranger.postMessage('signed-out:maria@example.test');
		stranger.postMessage(null);
		await settle();
		expect(tab).not.toHaveBeenCalled();
		stranger.postMessage('signed-out');
		await settle();
		expect(tab).toHaveBeenCalledTimes(1);
		expect(closed).not.toHaveBeenCalled();
		stranger.close();
	});
});
