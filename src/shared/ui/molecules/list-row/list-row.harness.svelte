<script lang="ts">
	import { ListRow } from './index';

	let {
		href,
		opens = false,
		onSignIn = () => {},
		onPress = () => {}
	}: {
		href?: string;
		opens?: boolean;
		onSignIn?: () => void;
		onPress?: (event: MouseEvent) => void;
	} = $props();

	let expanded = $state(false);
</script>

{#snippet leading()}<i data-testid="glyph"></i>{/snippet}
{#snippet meta()}<button type="button" data-testid="sign-in" class="size-touch" onclick={onSignIn}
		>Σύνδεση</button
	>{/snippet}
{#snippet end()}<span data-testid="end">40 €</span>{/snippet}
{#snippet body()}<p data-testid="body">Το κείμενο</p>{/snippet}

<ListRow
	title="<b>Τίτλος</b>"
	subtitle="<i>Γραμμή</i>"
	{leading}
	{meta}
	{end}
	{href}
	onclick={onPress}
	expanded={opens ? expanded : undefined}
	onToggle={opens ? () => (expanded = !expanded) : undefined}
	body={opens ? body : undefined}
	testId="row"
/>
