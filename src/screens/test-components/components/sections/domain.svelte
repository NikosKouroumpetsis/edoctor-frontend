<script lang="ts">
	import { today, getLocalTimeZone, DateFormatter } from '@internationalized/date';
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
		<div class="w-full overflow-hidden rounded-control border border-border">
			<SiteNavbar />
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
		<div class="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
		<div class="w-full max-w-md">
			<Carousel class="px-12">
				<CarouselContent>
					{#each ['clinic1', 'clinic2', 'clinic3'] as seed (seed)}
						<CarouselItem>
							<AspectRatio ratio={16 / 9} class="overflow-hidden rounded-media bg-muted">
								<img
									src={`https://picsum.photos/seed/${seed}/480/270`}
									alt={seed}
									class="size-full object-cover"
								/>
							</AspectRatio>
						</CarouselItem>
					{/each}
				</CarouselContent>
				<div class="absolute top-1/2 left-0 -translate-y-1/2"><CarouselPrevious /></div>
				<div class="absolute top-1/2 right-0 -translate-y-1/2"><CarouselNext /></div>
				<CarouselDots class="mt-3" />
			</Carousel>
		</div>
	</DemoRow>

	<DemoRow label="Cookie consent">
		<CookieConsent />
	</DemoRow>
</DemoSection>
