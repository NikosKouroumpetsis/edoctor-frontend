import { afterNavigate } from '$app/navigation';

/**
 * «‹» of the profile and of its error page: back to the page of the site it came from (the results with their
 * search); opened from outside, it follows its own link (the results).
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
