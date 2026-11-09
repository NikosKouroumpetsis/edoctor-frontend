import { afterNavigate } from '$app/navigation';

/**
 * A page's «‹»: back to the page of the site it came from (the results with their search); opened from outside, it
 * follows its own link (the results).
 */
export function useSiteBack(): (event: MouseEvent) => void {
	let cameFromSite = false;
	afterNavigate(({ from }) => {
		if (from) cameFromSite = true;
	});
	return (event) => {
		if (!cameFromSite) return;
		event.preventDefault();
		history.back();
	};
}
