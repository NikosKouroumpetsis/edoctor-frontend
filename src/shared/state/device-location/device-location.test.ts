import { afterEach, describe, expect, it } from 'vitest';
import { forgetDeviceLocation, readFreshDeviceLocation, rememberDeviceLocation } from '.';

afterEach(() => {
	forgetDeviceLocation();
	localStorage.clear();
	sessionStorage.clear();
});

describe('shared::state::device-location', () => {
	it('S-07.3 (κανόνας 11, web): the position read lives in this visit’s memory alone — the coordinates, nothing else', () => {
		expect(readFreshDeviceLocation()).toBeNull();
		rememberDeviceLocation({ latitude: 37.943, longitude: 23.647, accuracy: 9 } as never);
		expect(readFreshDeviceLocation()).toEqual({ latitude: 37.943, longitude: 23.647 });
	});

	it('S-07.3 (κανόνας 11, web, negative): no storage and no cookie ever holds it; forgotten, it is gone', () => {
		const cookie = document.cookie;
		rememberDeviceLocation({ latitude: 37.943, longitude: 23.647 });
		expect(localStorage.length).toBe(0);
		expect(sessionStorage.length).toBe(0);
		expect(document.cookie).toBe(cookie);
		expect(document.cookie).not.toMatch(/37\.943|23\.647/u);
		forgetDeviceLocation();
		expect(readFreshDeviceLocation()).toBeNull();
	});
});
