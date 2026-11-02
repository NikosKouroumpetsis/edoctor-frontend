// Test stand-in for SvelteKit's `$app/state` virtual module. Only the fields our
// components read (notably `page.url`) need to be present.
export const page = {
	url: new URL('http://localhost/'),
	params: {} as Record<string, string>,
	route: { id: null as string | null },
	status: 200,
	error: null as Error | null,
	data: {} as Record<string, unknown>,
	form: undefined as unknown,
	// Shallow routing's state (wave 1.5, the profile's windows): a spec sets it before the render, as `page.url`.
	state: {} as App.PageState
};

export const navigating = null;
export const updated = { current: false };
