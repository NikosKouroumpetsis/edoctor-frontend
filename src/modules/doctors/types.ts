import type { CalendarDate } from '@internationalized/date';

export type DoctorSearchQuery = {
	specialty: string;
	location: string;
	date?: CalendarDate;
};

export type Doctor = {
	id: string;
	name: string;
	specialty: string;
	location: string;
	rating: number;
	reviews: number;
	avatarUrl?: string;
	imageUrl?: string;
	available: boolean;
	/** Specialisation tags. */
	tags: string[];
};

export type TimeSlot = {
	time: string;
	available: boolean;
};

export type DaySlots = {
	/** ISO date `YYYY-MM-DD`. */
	date: string;
	label: string;
	weekday: string;
	slots: TimeSlot[];
};
