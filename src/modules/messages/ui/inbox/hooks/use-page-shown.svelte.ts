/** Whether the page shows: a message is read only by someone who can see it. */
export function usePageShown() {
	let shown = $state(true);
	$effect(() => {
		const read = () => {
			shown = document.visibilityState !== 'hidden';
		};
		read();
		document.addEventListener('visibilitychange', read);
		return () => document.removeEventListener('visibilitychange', read);
	});
	return {
		get current() {
			return shown;
		}
	};
}
