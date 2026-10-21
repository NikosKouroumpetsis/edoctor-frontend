import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * The app env constants are computed once at import, so each case re-imports a fresh
 * copy of the public env stand-in and of `./env` after setting the runtime values.
 */
async function loadAppEnv(settings: Record<`PUBLIC_${string}`, string>) {
	vi.resetModules();
	const { env } = await import('$env/dynamic/public');
	Object.assign(env, settings);
	return import('./env');
}

afterEach(() => {
	vi.resetModules();
});

describe('app env and variant', () => {
	it('uses the runtime PUBLIC_APP_ENV and scopes the preferences key to it', async () => {
		const config = await loadAppEnv({ PUBLIC_APP_ENV: 'preview' });

		expect(config.appEnv).toBe('preview');
		expect(config.appVariant).toBe('preview');
		expect(config.preferencesStorageKey).toBe('edoctor.preview.preferences.v1');
	});

	it('falls back to the Vite mode when PUBLIC_APP_ENV is missing', async () => {
		const config = await loadAppEnv({});

		expect(config.appEnv).toBe('test');
		expect(config.appVariant).toBe('development');
		expect(config.preferencesStorageKey).toBe('edoctor.test.preferences.v1');
	});

	it('ignores an unknown PUBLIC_APP_ENV and keeps the Vite mode', async () => {
		const config = await loadAppEnv({ PUBLIC_APP_ENV: 'staging' });

		expect(config.appEnv).toBe('test');
		expect(config.preferencesStorageKey).toBe('edoctor.test.preferences.v1');
	});

	it('uses the runtime PUBLIC_APP_VARIANT over the one derived from the app env', async () => {
		const config = await loadAppEnv({
			PUBLIC_APP_ENV: 'production',
			PUBLIC_APP_VARIANT: 'preview'
		});

		expect(config.appEnv).toBe('production');
		expect(config.appVariant).toBe('preview');
	});

	it('ignores an unknown PUBLIC_APP_VARIANT and derives it from the app env', async () => {
		const config = await loadAppEnv({ PUBLIC_APP_ENV: 'production', PUBLIC_APP_VARIANT: 'qa' });

		expect(config.appVariant).toBe('production');
	});
});
