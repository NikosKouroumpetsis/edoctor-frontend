<script lang="ts">
	import { today, getLocalTimeZone, DateFormatter } from '@internationalized/date';
	import { m } from '$paraglide/messages.js';
	import { SiteNavbar } from '$shared/ui/organisms/site-navbar';
	import { CookieConsent } from '$shared/ui/organisms/cookie-consent';
	import { DoctorCard } from '$modules/doctors/ui/doctor-card';
	import { AvailabilityTable } from '$modules/doctors/ui/availability-table';
	import { DoctorSearchBar, type DoctorSearchQuery } from '$modules/doctors/ui/search-bar';
	import {
		Carousel,
		CarouselContent,
		CarouselItem,
		CarouselPrevious,
		CarouselNext,
		CarouselDots
	} from '$shared/ui/primitives/carousel';
	import { AspectRatio } from '$shared/ui/primitives/aspect-ratio';
	import type { Doctor, DaySlots } from '$modules/doctors/types';
	import DemoSection from '../demo-section.svelte';
	import DemoRow from '../demo-row.svelte';

	const doctors: Doctor[] = [
		{
			id: '1',
			name: 'Maria Alexiou',
			specialty: 'Cardiology',
			location: 'Kolonaki, Athens',
			rating: 4.9,
			reviews: 128,
			available: true,
			tags: ['ECG', 'Hypertension'],
			imageUrl: 'https://picsum.photos/seed/doc1/320/180'
		},
		{
			id: '2',
			name: 'Giorgos Pappas',
			specialty: 'Dermatology',
			location: 'Glyfada, Athens',
			rating: 4.7,
			reviews: 86,
			available: false,
			tags: ['Acne', 'Laser'],
			imageUrl: 'https://picsum.photos/seed/doc2/320/180'
		},
		{
			id: '3',
			name: 'Eleni Nikolaou',
			specialty: 'Paediatrics',
			location: 'Nea Smyrni, Athens',
			rating: 5.0,
			reviews: 203,
			available: true,
			tags: ['Newborn', 'Vaccines'],
			imageUrl: 'https://picsum.photos/seed/doc3/320/180'
		}
	];

	// A mock week of availability built around today.
	const tz = getLocalTimeZone();
	const dayFmt = new DateFormatter('en-GB', { day: 'numeric', month: 'short' });
	const weekdayFmt = new DateFormatter('en-GB', { weekday: 'short' });
	const HOURS = ['09:00', '09:30', '10:00', '11:00', '12:30'];
	const start = today(tz);
	const days: DaySlots[] = Array.from({ length: 5 }, (_, i) => {
		const d = start.add({ days: i });
		const jsDate = d.toDate(tz);
		return {
			date: d.toString(),
			label: dayFmt.format(jsDate),
			weekday: weekdayFmt.format(jsDate),
			slots: HOURS.map((time, h) => ({ time, available: (i + h) % 3 !== 0 }))
		};
	});

	let lastSearch = $state<DoctorSearchQuery | null>(null);
	let selectedSlot = $state('');
</script>

<DemoSection
	id="domain"
	title="Domain components"
	description="Real eDoctor compositions built entirely from the in-house kit (mock data)."
>
	<DemoRow label="Site navbar (resize / open the avatar menu / mobile menu)">
		<div class="w-full overflow-hidden rounded-md border border-border">
			<SiteNavbar
				brand="eDoctor"
				brandHref="#domain"
				brandIcon="medical-outline"
				links={[
					{ label: 'Doctors', href: '#doctors' },
					{ label: 'Clinics', href: '#clinics' },
					{ label: 'Plans', href: '#plans' }
				]}
				primaryNavLabel="Primary"
				mobileNavLabel="Mobile"
				openMenuLabel="Open menu"
				closeMenuLabel="Close"
				userName="Maria Alexiou"
				accountMenuLabel="Account menu"
				menuItems={[
					{ label: 'Profile' },
					{ label: 'Appointments' },
					{ label: 'Sign out', destructive: true }
				]}
			/>
		</div>
	</DemoRow>

	<DemoRow
		label="Doctor search bar {lastSearch
			? `→ ${JSON.stringify(lastSearch.specialty)} @ ${lastSearch.location}`
			: ''}"
	>
		<DoctorSearchBar onSearch={(q) => (lastSearch = q)} />
	</DemoRow>

	<DemoRow label="Doctor cards">
		<div class="grid w-full gap-4 tablet:grid-cols-2 laptop:grid-cols-3">
			{#each doctors as doctor (doctor.id)}
				<DoctorCard {doctor} />
			{/each}
		</div>
	</DemoRow>

	<DemoRow label="Availability {selectedSlot ? `→ ${selectedSlot}` : ''}">
		<AvailabilityTable
			title="Dr. Maria Alexiou"
			{days}
			bind:selected={selectedSlot}
			canPrev={false}
		/>
	</DemoRow>

	<DemoRow label="Image carousel">
		<div class="w-full max-w-text">
			<Carousel roleDescription="carousel">
				<CarouselContent>
					{#each ['clinic1', 'clinic2', 'clinic3'] as seed (seed)}
						<CarouselItem roleDescription="slide">
							<AspectRatio ratio={16 / 9} class="overflow-hidden rounded-xl bg-muted">
								<img
									src={`https://picsum.photos/seed/${seed}/480/270`}
									alt={seed}
									class="size-full object-cover"
								/>
							</AspectRatio>
						</CarouselItem>
					{/each}
				</CarouselContent>
				<CarouselPrevious label={m.common_previous_slide()} />
				<CarouselNext label={m.common_next_slide()} />
				<CarouselDots
					class="mt-3"
					dotLabel={(index) => m.common_go_to_slide({ position: index + 1 })}
				/>
			</Carousel>
		</div>
	</DemoRow>

	<DemoRow label="Cookie consent">
		<CookieConsent
			title="We value your privacy"
			description="We use cookies to improve your experience, analyse traffic and personalise content. You can accept all or only the essentials."
			acceptLabel="Accept all"
			rejectLabel="Essentials only"
			aria-label="Cookie consent"
		/>
	</DemoRow>
</DemoSection>
