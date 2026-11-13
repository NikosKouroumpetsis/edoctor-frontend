<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { InlineLinkText } from '$shared/ui/primitives/inline-link-text';
	import Card from '../components/card.svelte';
	import type { PrivacyPageProps } from '../types';

	let { locale, member, links, toolsLine }: PrivacyPageProps = $props();

	const options = $derived({ locale });
</script>

<!-- Wave 4.5 · screen 62 «Απόρρητο» (record §5.7, U-173; `62-privacy/priv.js` `home()`, `priv.css`): the group «Απόρρητο
     δεδομένων», three card-rows and a box. 1 · «Τα προσωπικά σας δεδομένα» ⇒ the Privacy policy (D-W45-27; the
     controller's contact is never written here). 2 · «Εργαλεία τρίτων και cookies», with what is open (D-W45-28).
     3 · «Διαγραφή λογαριασμού», ONLY with a session (D-W45-29). 4 · the box, with the policy's link. The page's title is
     the shell's section title. -->
<div data-testid="privacy-page" data-member={member || undefined} class="flex flex-col">
	<h3 class="mt-5 mb-1 text-title-lg font-semibold text-foreground">
		{m.profile_privacy_group({}, options)}
	</h3>
	<ul class="flex flex-col gap-3 pt-3">
		<li>
			<Card
				title={m.profile_privacy_data_title({}, options)}
				line={m.profile_privacy_data_body({}, options)}
				href={links.rights}
				testId="privacy-data"
			/>
		</li>
		<li>
			<Card
				title={m.profile_privacy_tools_title({}, options)}
				line={toolsLine}
				href={links.tools}
				testId="privacy-tools"
			/>
		</li>
		{#if member}
			<li>
				<Card
					title={m.profile_account_deletion_title({}, options)}
					line={m.profile_account_settings_deletion_hint({}, options)}
					href={links.deletion}
					testId="privacy-deletion"
				/>
			</li>
		{/if}
	</ul>
	<div
		data-testid="privacy-box"
		class="mt-4 flex flex-row gap-3.5 rounded-md border border-line bg-background p-4.5"
	>
		<Ionicon name="lock-closed-outline" class="icon-lg shrink-0 text-primary-text" />
		<div class="grid min-w-0 gap-0.5">
			<p class="text-body-md font-semibold text-foreground">
				{m.profile_privacy_box_title({}, options)}
			</p>
			<!-- The screen's address, already resolved (a module knows no route). -->
			<InlineLinkText
				text={m.profile_privacy_box_text({}, options)}
				linkLabel={m.profile_privacy_box_link({}, options)}
				tail={m.profile_privacy_box_tail({}, options)}
				href={links.policy}
				linkTestId="privacy-policy-link"
			/>
		</div>
	</div>
</div>
