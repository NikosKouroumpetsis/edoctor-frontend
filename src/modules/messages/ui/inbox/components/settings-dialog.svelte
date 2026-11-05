<script lang="ts">
	import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { personalQueryMeta } from '$shared/query';
	import { Ionicon, type IoniconName } from '$shared/ui/icons/ionicon';
	import { getToastsOptional } from '$shared/ui/molecules/toast';
	import { Switch } from '$shared/ui/primitives/switch';
	import { ActionDialog } from '$shared/ui/templates/action-dialog';
	import {
		doctorSettingsQuery,
		messagesQueryKeys,
		updateDoctorSettings
	} from '$modules/messages/api/conversations';
	import {
		messagePreferencesKey,
		messagePreferencesQuery,
		updateMessagePreference,
		type MessagePreferences
	} from '$modules/messages/api/preferences';

	let {
		open = $bindable(false),
		locale,
		archiveHref,
		isMember
	}: {
		open?: boolean;
		locale: SupportedLocale;
		archiveHref: string;
		isMember: boolean;
	} = $props();

	const options = $derived({ locale });
	const client = useQueryClient();
	const toasts = getToastsOptional();

	// Asked only when it opens: the page itself needs neither.
	const preferences = createQuery(() => messagePreferencesQuery(open && isMember));
	const doctor = createQuery(() => doctorSettingsQuery(open && isMember));

	type Channel = 'push' | 'email';

	const failed = () =>
		toasts?.show({ tone: 'danger', message: m.messages_toast_failed({}, options) });

	type PreferenceWrite = { channel: Channel; enabled: boolean };
	const writePreference = createMutation<
		MessagePreferences,
		unknown,
		PreferenceWrite,
		{ before?: MessagePreferences }
	>(() => ({
		mutationFn: ({ channel, enabled }) => {
			const target = preferences.data?.[channel];
			if (!target) throw new Error('no such switch');
			return updateMessagePreference(target, enabled);
		},
		onMutate: ({ channel, enabled }) => {
			const before = client.getQueryData<MessagePreferences>(messagePreferencesKey);
			const current = before?.[channel];
			if (before && current) {
				client.setQueryData<MessagePreferences>(messagePreferencesKey, {
					...before,
					[channel]: { ...current, enabled }
				});
			}
			return { before };
		},
		onSuccess: (next) => {
			client.setQueryDefaults(messagePreferencesKey, { meta: personalQueryMeta });
			client.setQueryData<MessagePreferences>(messagePreferencesKey, next);
		},
		onError: (_error, _input, context) => {
			client.setQueryData(messagePreferencesKey, context?.before);
			failed();
		}
	}));

	const writeAccepts = createMutation(() => ({
		mutationFn: (accepts: boolean) => updateDoctorSettings(accepts),
		onSuccess: (next) => {
			client.setQueryDefaults(messagesQueryKeys.doctorSettings(), { meta: personalQueryMeta });
			client.setQueryData(messagesQueryKeys.doctorSettings(), next);
		},
		onError: failed
	}));
</script>

{#snippet row(
	icon: IoniconName,
	label: string,
	body: string,
	checked: boolean,
	onCheckedChange: (next: boolean) => void,
	testId: string
)}
	<div class="flex min-h-control-xl flex-row items-center gap-4 border-b border-border/60 py-2">
		<Ionicon name={icon} class="icon-lg shrink-0 text-foreground" />
		<div class="grid min-w-0 flex-1 gap-0.5">
			<span class="text-body-lg text-foreground">{label}</span>
			<span class="text-label-lg font-normal text-muted-foreground">{body}</span>
		</div>
		<Switch
			{checked}
			{onCheckedChange}
			showCheck={false}
			aria-label={label}
			data-testid={testId}
			class="shrink-0"
		/>
	</div>
{/snippet}

<!-- U-84 Π1, Π4 (Airbnb's IMG_2610): the sheet below 744, the 480 window from it. A doctor has «Δέχομαι» too. -->
<ActionDialog
	bind:open
	title={m.messages_settings({}, options)}
	closeLabel={m.messages_close({}, options)}
	testId="messages-settings-dialog"
>
	<div class="grid">
		{#if preferences.data?.push}
			{@render row(
				'notifications-outline',
				m.messages_settings_push({}, options),
				m.messages_settings_push_body({}, options),
				preferences.data.push.enabled,
				(enabled) => writePreference.mutate({ channel: 'push', enabled }),
				'messages-settings-push'
			)}
		{/if}
		{#if preferences.data?.email}
			{@render row(
				'mail-outline',
				m.messages_settings_email({}, options),
				m.messages_settings_email_body({}, options),
				preferences.data.email.enabled,
				(enabled) => writePreference.mutate({ channel: 'email', enabled }),
				'messages-settings-email'
			)}
		{/if}
		{#if doctor.data}
			{@render row(
				'chatbubbles-outline',
				m.messages_settings_accept({}, options),
				m.messages_settings_accept_body({}, options),
				doctor.data.acceptsNewConversations,
				(accepts) => writeAccepts.mutate(accepts),
				'messages-settings-accept'
			)}
		{/if}
		<!-- The screen's address, already resolved (a module knows no route). -->
		<!-- eslint-disable svelte/no-navigation-without-resolve -->
		<a
			href={archiveHref}
			data-testid="messages-settings-past"
			onclick={() => (open = false)}
			class="group flex min-h-control-xl w-full flex-row items-center gap-4 py-2 text-body-lg text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
		>
			<Ionicon name="archive-outline" class="icon-lg shrink-0" />
			<span class="min-w-0 flex-1 can-hover:group-hover:underline"
				>{m.messages_past({}, options)}</span
			>
			<Ionicon name="chevron-forward" class="icon-md shrink-0 text-muted-foreground" />
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	</div>
</ActionDialog>
