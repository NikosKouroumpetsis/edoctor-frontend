import { afterEach, describe, expect, it } from 'vitest';
import { env } from '$env/dynamic/public';
import { getApiBaseUrl } from './api';

afterEach(() => {
	delete env.PUBLIC_API_BASE_URL;
});

describe('getApiBaseUrl', () => {
	it('falls back to the local seed-mock server when the setting is missing', () => {
		expect(getApiBaseUrl()).toBe('http://localhost:8080/api/v1');
	});

	it.each(['', '   '])('falls back to the local default for the blank value %j', (value) => {
		env.PUBLIC_API_BASE_URL = value;
		expect(getApiBaseUrl()).toBe('http://localhost:8080/api/v1');
	});

	it('returns the runtime setting instead of the local default', () => {
		env.PUBLIC_API_BASE_URL = 'https://api.example.gr/api/v1';
		expect(getApiBaseUrl()).toBe('https://api.example.gr/api/v1');
	});

	it('drops surrounding spaces and the trailing slash of the runtime setting', () => {
		env.PUBLIC_API_BASE_URL = '  https://api.example.gr/api/v1/ ';
		expect(getApiBaseUrl()).toBe('https://api.example.gr/api/v1');
	});
});
