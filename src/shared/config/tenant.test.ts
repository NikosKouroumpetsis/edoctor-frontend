import { afterEach, describe, expect, it } from 'vitest';
import { env } from '$env/dynamic/public';
import { getTenantSlug } from './tenant';

afterEach(() => {
	delete env.PUBLIC_TENANT_SLUG;
});

describe('getTenantSlug', () => {
	it('names the tenant of the seeded server without a setting, as the application', () => {
		expect(getTenantSlug()).toBe('edoctor-seed-main');
	});

	it('reads `PUBLIC_TENANT_SLUG` trimmed and lower-cased; a blank one is no setting', () => {
		env.PUBLIC_TENANT_SLUG = '  EDoctor ';
		expect(getTenantSlug()).toBe('edoctor');
		env.PUBLIC_TENANT_SLUG = '   ';
		expect(getTenantSlug()).toBe('edoctor-seed-main');
	});
});
