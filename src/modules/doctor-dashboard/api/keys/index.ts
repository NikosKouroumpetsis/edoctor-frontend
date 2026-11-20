/** The office a read is narrowed to (screen 67's filter, D-W51-29): none is every office, «Σήμερα»'s own read. */
const narrowed = (officeId: string | null | undefined) => (officeId ? [officeId] : []);

/**
 * The doctor dashboard's reads in TanStack's cache, under ONE root: «who am I as a doctor» (`GET /doctor/me/dashboard`),
 * and since screen 66 the doctor's side of the appointments (D-W51-22: the requests, the day, the upcoming) and the
 * readiness that says «Δεν δέχεστε ακόμη ραντεβού»; since screen 67 (D-W51-29) its tabs — the rest of today, the
 * history page after page, each of them for one office too — and the doctor's offices. Personal
 * (`personalQueryMeta`): a sign-out leaves none of it in the tab; a write invalidates `appointments()` whole, and
 * `requests()` names every office's requests (its key is the prefix of each).
 */
export const doctorDashboardQueryKeys = {
	all: ['doctor-dashboard'] as const,
	standing: () => [...doctorDashboardQueryKeys.all, 'standing'] as const,
	appointments: () => [...doctorDashboardQueryKeys.all, 'appointments'] as const,
	requests: (officeId?: string | null) =>
		[...doctorDashboardQueryKeys.appointments(), 'requests', ...narrowed(officeId)] as const,
	/** One day's window of the server's clock (`from` yesterday 00:00 Athens, `to` the day's end). */
	day: (from: string, to: string) =>
		[...doctorDashboardQueryKeys.appointments(), 'day', from, to] as const,
	/** Screen 67's «Σήμερα» of «Επερχόμενα»: the server's `scope=today`. */
	today: (officeId?: string | null) =>
		[...doctorDashboardQueryKeys.appointments(), 'today', ...narrowed(officeId)] as const,
	upcoming: (officeId?: string | null) =>
		[...doctorDashboardQueryKeys.appointments(), 'upcoming', ...narrowed(officeId)] as const,
	/** Screen 67's «Ιστορικό», newest first, page after page (`scope=history&sortDir=desc`). */
	history: (officeId?: string | null) =>
		[...doctorDashboardQueryKeys.appointments(), 'history', ...narrowed(officeId)] as const,
	readiness: () => [...doctorDashboardQueryKeys.all, 'readiness'] as const,
	/**
	 * Screen 68 (D-W51-38): one appointment's detail — beside the lists' root, not under it, so a write puts its answer
	 * here itself and invalidates the lists alone (D-W51-36: the detail is never read twice for one tap).
	 */
	detail: (appointmentId: string) =>
		[...doctorDashboardQueryKeys.all, 'appointment', appointmentId] as const,
	/** The doctor's offices (`GET /doctor/profile/offices`): screen 67's filter, only with more than one. */
	offices: () => [...doctorDashboardQueryKeys.all, 'offices'] as const,
	/**
	 * Screen 70 (D-W51-41): the doctor's free hours to move one appointment to, a week after another — beside the detail
	 * (never under the lists: a write of another appointment reads them again only when the screen asks).
	 */
	rescheduleSlots: (appointmentId: string) =>
		[...doctorDashboardQueryKeys.all, 'reschedule-slots', appointmentId] as const,
	/**
	 * Screen 70 «Υπηρεσίες και κόστος» (D-W51-44): the doctor's own services, in the page's language — and
	 * `servicesAll()` every language of them: 🔴 D-W52-73 a write of screen 83 reads them again (70, 72 follow).
	 */
	servicesAll: () => [...doctorDashboardQueryKeys.all, 'services'] as const,
	services: (locale: string) => [...doctorDashboardQueryKeys.servicesAll(), locale] as const,
	/**
	 * Screen 72 (D-W51-56 / 70): the doctor's free hours for a NEW appointment at one office and for the chosen services, a
	 * week after another — beside the lists (a booking reads them again only when the screen asks).
	 */
	newSlots: (officeId: string, serviceIds: readonly string[]) =>
		[...doctorDashboardQueryKeys.all, 'new-slots', officeId, ...serviceIds] as const,
	/** Screen 72 (D-W51-55): «οι ασθενείς μου» — every read of the search under one root (a booking reads them again). */
	patients: () => [...doctorDashboardQueryKeys.all, 'patients'] as const,
	patientSearch: (query: string) =>
		[...doctorDashboardQueryKeys.patients(), 'search', query] as const,
	/** «Ίδιο κινητό» (D-W51-55): the people of the doctor with one mobile, in its stored form. */
	patientPhone: (phone: string) =>
		[...doctorDashboardQueryKeys.patients(), 'phone', phone] as const,
	/** One patient of the doctor by its key (`?kind=&id=` of screen 72, D-W51-69). */
	patient: (kind: string, id: string) =>
		[...doctorDashboardQueryKeys.patients(), kind, id] as const,
	/**
	 * Screen 73 (D-W51-64 / 65): «Οι ασθενείς μου» page after page for the words typed, one patient's card, and the pages of
	 * its «Επόμενα» / «Προηγούμενα» after the card's first — all under `patients()`, so a booking (72), a change of a
	 * record or a join reads them again.
	 */
	patientList: (query: string) => [...doctorDashboardQueryKeys.patients(), 'list', query] as const,
	patientCard: (kind: string, id: string) =>
		[...doctorDashboardQueryKeys.patients(), 'card', kind, id] as const,
	patientAppointments: (kind: string, id: string, section: string) =>
		[...doctorDashboardQueryKeys.patients(), 'appointments', kind, id, section] as const,
	/** Screen 72's «Ενημέρωση» (D-W51-70): the doctor's SMS switches and what is left of the packages. */
	smsSettings: () => [...doctorDashboardQueryKeys.all, 'sms-settings'] as const,
	smsBalance: () => [...doctorDashboardQueryKeys.all, 'sms-balance'] as const,
	/**
	 * Screen 77 (D-W52-17 / 18): «Το προφίλ μου» — what the sections hold and «Δείτε πώς σας βλέπουν», each in the page's
	 * language, under ONE root: a write of a section (screens 78–83) reads both again by invalidating `profile()`.
	 */
	profile: () => [...doctorDashboardQueryKeys.all, 'profile'] as const,
	profileOverview: (locale: string) =>
		[...doctorDashboardQueryKeys.profile(), 'overview', locale] as const,
	profilePreview: (locale: string) =>
		[...doctorDashboardQueryKeys.profile(), 'preview', locale] as const,
	/** Screen 79 (D-W52-47): the Greek name and description of the public page — one read, whatever the page's language. */
	profileText: () => [...doctorDashboardQueryKeys.profile(), 'text'] as const,
	/** Screen 78 (D-W52-36): the doctor's photos in the server's order — one list, whatever the page's language. */
	profileImages: () => [...doctorDashboardQueryKeys.profile(), 'images'] as const,
	/** Screen 80 (D-W52-59): the practice licence's number and day — one read, whatever the page's language. */
	profileLicence: () => [...doctorDashboardQueryKeys.profile(), 'licence'] as const,
	/**
	 * Screen 80 (D-W52-54 / 59): the specializations the doctor's specialty may pick from and the doctor's own picks, each
	 * named in the page's language — under the profile's root, so a save reads them again with «Το προφίλ μου».
	 */
	profileSpecializationOptions: (locale: string) =>
		[...doctorDashboardQueryKeys.profile(), 'specialization-options', locale] as const,
	profileSpecializations: (locale: string) =>
		[...doctorDashboardQueryKeys.profile(), 'specializations', locale] as const,
	/**
	 * Screen 81 (D-W52-63): the doctor's biography in the server's order — one read, whatever the page's language (the
	 * doctor reads and writes Greek, U-207.3) — under the profile's root, so a save reads it again with «Το προφίλ μου».
	 */
	profileCredentials: () => [...doctorDashboardQueryKeys.profile(), 'credentials'] as const,
	/**
	 * Screen 82 (D-W52-69 / 70): the catalogue of languages and the doctor's own languages, each named in the page's
	 * language, and the four links of the doctor's page — under the profile's root, so a save reads them again with «Το
	 * προφίλ μου».
	 */
	profileLanguageOptions: (locale: string) =>
		[...doctorDashboardQueryKeys.profile(), 'language-options', locale] as const,
	profileLanguages: (locale: string) =>
		[...doctorDashboardQueryKeys.profile(), 'languages', locale] as const,
	profileLinks: () => [...doctorDashboardQueryKeys.profile(), 'links'] as const,
	/**
	 * Screen 83 (D-W52-73 / 79): the doctor's services in the doctor's order and the catalogue of the specialty, each
	 * titled in the page's language — under the profile's root, so a save reads them again with «Το προφίλ μου».
	 */
	profileServices: (locale: string) =>
		[...doctorDashboardQueryKeys.profile(), 'services', locale] as const,
	profileServiceOptions: (locale: string) =>
		[...doctorDashboardQueryKeys.profile(), 'service-options', locale] as const,
	/**
	 * Screen 84 (D-W52-91 / 92): the doctor's reviews under ONE root — the list page after page for each choice («Όλες»,
	 * «Χωρίς απάντηση»), the summary for the doctor alone, one review by its id, and the one review of an appointment (the
	 * row of 68, D-W52-89): a reply, its change, its deletion or a report reads them all again by invalidating `reviews()`.
	 */
	reviews: () => [...doctorDashboardQueryKeys.all, 'reviews'] as const,
	reviewList: (filter: string) => [...doctorDashboardQueryKeys.reviews(), 'list', filter] as const,
	reviewSummary: (locale: string) =>
		[...doctorDashboardQueryKeys.reviews(), 'summary', locale] as const,
	review: (ratingId: string) => [...doctorDashboardQueryKeys.reviews(), 'one', ratingId] as const,
	appointmentReview: (appointmentId: string) =>
		[...doctorDashboardQueryKeys.reviews(), 'appointment', appointmentId] as const,
	/**
	 * Screen 85 (D-W52-102 / 103): «Τα άρθρα μου» under ONE root — the list page after page and one article by its id: a
	 * draft, a sending or a deletion reads them all again by invalidating `articles()`.
	 */
	articles: () => [...doctorDashboardQueryKeys.all, 'articles'] as const,
	articleList: () => [...doctorDashboardQueryKeys.articles(), 'list'] as const,
	article: (articleId: string) =>
		[...doctorDashboardQueryKeys.articles(), 'one', articleId] as const
};
