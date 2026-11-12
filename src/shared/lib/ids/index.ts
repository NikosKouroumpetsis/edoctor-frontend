const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/**
 * 🔴 U-65.6: whether `value` is a server id (every id of the API is a UUID, `@db.Uuid`), read at an address's boundary
 * before a route takes it — anything else is no page.
 */
export function isUuid(value: string): boolean {
	return UUID.test(value);
}
