const DIRECTIONS_URL = 'https://www.google.com/maps/dir/';

export type DirectionsDestination = {
	coordinates?: { latitude: number; longitude: number };
	/** The address, when the place has no point on the map. */
	address?: string;
};

/**
 * U-68.1 Π4 / U-35.3: the map service's directions to a place — by its point, else by its address; `null` with neither.
 * The destination is encoded here, so an address's words can never change the link.
 */
export function buildDirectionsUrl({ coordinates, address }: DirectionsDestination): string | null {
	const destination = coordinates
		? `${coordinates.latitude},${coordinates.longitude}`
		: address?.trim();
	if (!destination) return null;
	const query = new URLSearchParams({ api: '1', destination });
	return `${DIRECTIONS_URL}?${query.toString()}`;
}
