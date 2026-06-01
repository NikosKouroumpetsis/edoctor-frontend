import { browser } from '$app/environment';
import { QueryClient } from '@tanstack/svelte-query';

export function createQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				enabled: browser,
				staleTime: 30_000,
				gcTime: 5 * 60_000,
				retry: 1
			},
			mutations: {
				retry: 0
			}
		}
	});
}
