<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Button } from '$shared/ui/primitives/button';
	import { UploadRing } from '$shared/ui/primitives/upload-ring';
	import {
		doctorPhotoIssueRetries,
		doctorPhotoIssueText
	} from '$modules/doctor-dashboard/lib/photos';
	import type { DoctorPhotoUpload } from '../types';

	let {
		upload,
		locale,
		onRetry,
		onDrop
	}: {
		upload: DoctorPhotoUpload;
		locale: SupportedLocale;
		onRetry: () => void;
		onDrop: () => void;
	} = $props();

	const options = $derived({ locale });
	const failed = $derived(upload.status === 'failed');
	const reason = $derived(upload.issue ? doctorPhotoIssueText(upload.issue, locale) : null);
	// A file the server refused for what it IS can never pass: only «×» then.
	const retries = $derived(upload.issue === null || doctorPhotoIssueRetries(upload.issue));
</script>

<!-- 🔴 D-W52-38 (`64-switch/sw.js` `photosBody` `up`, `sw.css` `.w-ring`, `.w-phfail`): a picked photo on its way — the
     file itself, faded, under the ring that fills as it is sent (it turns while it waits its turn); one that was not
     sent says «Δεν ανέβηκε», with the reason when the file itself was refused, «Ξανά» when trying again can help, and
     «×» to take it away. -->
<li
	data-testid={`doctor-photo-upload-${upload.id}`}
	data-status={upload.status}
	class="relative aspect-4/3 overflow-hidden rounded-md bg-chip"
>
	{#if upload.preview}
		<img src={upload.preview} alt="" class="size-full object-cover opacity-40" />
	{/if}
	{#if failed}
		<div
			role="alert"
			class="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center"
		>
			<p class="text-body-sm font-semibold text-foreground">
				{m.doctor_photos_failed({}, options)}
			</p>
			{#if reason}
				<p data-slot="doctor-photo-upload-reason" class="text-label-lg text-foreground">{reason}</p>
			{/if}
			{#if retries}
				<Button
					tone="outline"
					radius="full"
					hover={false}
					label={m.doctor_photos_retry({}, options)}
					onclick={onRetry}
					data-testid={`doctor-photo-upload-retry-${upload.id}`}
					class="bg-card"
				/>
			{/if}
		</div>
		<button
			type="button"
			aria-label={m.doctor_photos_remove({}, options)}
			onclick={onDrop}
			data-testid={`doctor-photo-upload-drop-${upload.id}`}
			class="group absolute top-0 right-0 grid size-touch place-items-center rounded-full outline-none"
		>
			<span
				class="grid size-control-xs place-items-center rounded-full bg-card text-foreground shadow-raised group-focus-visible:ring-3 group-focus-visible:ring-ring/50"
			>
				<Ionicon name="close" class="icon-md" />
			</span>
		</button>
	{:else}
		<div class="absolute inset-0 grid place-items-center">
			<UploadRing
				progress={upload.progress}
				indeterminate={upload.status === 'waiting' || upload.progress <= 0}
				trackColorName="border"
				aria-label={m.doctor_photos_uploading({}, options)}
			/>
		</div>
	{/if}
</li>
