import { describe, expect, it, vi } from 'vitest';
import { readFreshDeviceLocation, rememberDeviceLocation } from '.';

// The server's side of `$app/environment`: the memory is module state, so a server process would share it.
vi.mock('$app/environment', () => ({ browser: false }));

describe('shared::state::device-location (server)', () => {
	it('S-07.3 (κανόνας 11, web, negative): on the server nothing is kept — a render never shares a position', () => {
		rememberDeviceLocation({ latitude: 37.943, longitude: 23.647 });
		expect(readFreshDeviceLocation()).toBeNull();
	});
});
