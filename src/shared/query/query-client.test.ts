import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryObserver } from '@tanstack/svelte-query';
import { personalQueryMeta, removePersonalQueries, resetPersonalQueries } from '.';

describe('personal reads', () => {
	it('U-85: a guest keeps nothing of a member’s in the tab; the public reads stay', async () => {
		const client = new QueryClient();
		await client.prefetchQuery({
			queryKey: ['favorites', 'ids'],
			queryFn: () => ['d1'],
			meta: personalQueryMeta
		});
		await client.prefetchQuery({ queryKey: ['public'], queryFn: () => 'kept' });
		removePersonalQueries(client);
		expect(client.getQueryData(['favorites', 'ids'])).toBeUndefined();
		expect(client.getQueryData(['public'])).toBe('kept');
	});

	it('🔴 U-65.6: another account: a read on the screen loses its answer at once, and asks again; the public reads stay', async () => {
		const client = new QueryClient();
		let owner = 'a';
		const observer = new QueryObserver(client, {
			queryKey: ['messages', 'list'],
			queryFn: () => `of ${owner}`,
			meta: personalQueryMeta
		});
		const unsubscribe = observer.subscribe(() => undefined);
		await client.prefetchQuery({ queryKey: ['public'], queryFn: () => 'kept' });
		await vi.waitFor(() => expect(observer.getCurrentResult().data).toBe('of a'));

		owner = 'b';
		const reset = resetPersonalQueries(client);
		expect(client.getQueryData(['messages', 'list'])).toBeUndefined();
		await reset;
		expect(observer.getCurrentResult().data).toBe('of b');
		expect(client.getQueryData(['public'])).toBe('kept');
		unsubscribe();
	});
});
