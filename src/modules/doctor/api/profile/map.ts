import { resolveMediaUrl } from '$shared/lib/http';
import { toStarScore } from '$shared/lib/rating-stars';
import type {
	DoctorImagePublicView,
	DoctorPublicMarketplaceCredentialView,
	DoctorPublicMarketplaceProfileOfficeSummaryView,
	DoctorPublicMarketplaceProfileOfficeView,
	DoctorPublicMarketplaceProfileRatingView,
	DoctorPublicMarketplaceProfileResponseView,
	DoctorPublicMarketplaceProfileServiceView,
	DoctorPublicMarketplaceProfileView,
	DoctorPublicMarketplaceResponseMetricsView,
	DoctorPublicMarketplaceReviewPreviewView,
	DoctorResponseTime
} from '$shared/lib/api-client';
import type {
	DoctorBioFacts,
	DoctorBookingPolicyFacts,
	DoctorCredentialFacts,
	DoctorCredentialKind,
	DoctorFeeFacts,
	DoctorImageFacts,
	DoctorLanguageFacts,
	DoctorOfficeFacts,
	DoctorOfficePaymentOptionId,
	DoctorOfficeSummaryFacts,
	DoctorProfile,
	DoctorReviewChipFacts,
	DoctorReviewChipId,
	DoctorResponseMetricsFacts,
	DoctorResponseTimeId,
	DoctorReviewSnippet,
	DoctorServiceFacts,
	DoctorServiceKind,
	DoctorSocialLinkFacts,
	DoctorSocialLinkId
} from './types';

/**
 * Wire ⇒ FACTS for the public profile (the application's `api/profile/map`, S-01.6): no translation, no display
 * formatting; whatever the server nulls stays absent, and a value that could reach the page unsafely (a social
 * address, an unknown payment token) is dropped here, at the trust boundary.
 */

/** A doctor nobody may see: the backend answers `doctor: null` (or 404); the page is then the 404. */
export class DoctorProfileNotFoundError extends Error {
	constructor(slug: string) {
		super(`Doctor profile "${slug}" is unavailable.`);
		this.name = 'DoctorProfileNotFoundError';
	}
}

type RichTextNode = { text?: unknown; children?: unknown; content?: unknown };

/** The text of one rich-text node and its children (slate `children`, tiptap `content`), space-joined. */
function nodeText(node: unknown): string {
	if (!node || typeof node !== 'object') return '';
	const { text, children, content } = node as RichTextNode;
	const parts: string[] = typeof text === 'string' ? [text] : [];
	for (const list of [children, content]) {
		if (Array.isArray(list)) parts.push(...list.map(nodeText));
	}
	return parts
		.map((part) => part.trim())
		.filter(Boolean)
		.join(' ');
}

/** The paragraphs of the backend's rich text (`{ blocks: [{ children: [{ text }] }] }`), blank ones dropped. */
export function extractParagraphs(document: unknown): string[] {
	if (!document || typeof document !== 'object') return [];
	const { blocks, content } = document as { blocks?: unknown; content?: unknown };
	const roots = [
		...(Array.isArray(blocks) ? blocks : []),
		...(Array.isArray(content) ? content : [])
	];
	return roots.map(nodeText).filter(Boolean);
}

/** The aspect fields of the wire and their chip ids, in the ONE display order (the application's). */
export const REVIEW_ASPECT_FIELDS = [
	['trust', 'trustRating'],
	['expertise', 'expertiseRating'],
	['punctuality', 'punctualRating'],
	['friendliness', 'friendlyRating'],
	['in-depth', 'inDepthRating']
] as const satisfies readonly (readonly [
	DoctorReviewChipId,
	'trustRating' | 'expertiseRating' | 'punctualRating' | 'friendlyRating' | 'inDepthRating'
])[];

type AspectScores = Partial<Record<(typeof REVIEW_ASPECT_FIELDS)[number][1], number | null>>;

/** 🔴 U-49: the aspects on the 5 stars (`toStarScore`): a score off the scale (the old 1–10) is left out. */
export function aspectChips(scores: AspectScores | null | undefined): DoctorReviewChipFacts[] {
	if (!scores) return [];
	return REVIEW_ASPECT_FIELDS.flatMap(([id, field]) => {
		const score = toStarScore(scores[field]);
		return score === null ? [] : [{ id, score }];
	});
}

/**
 * One review as facts (the profile's preview and the reviews endpoint read it the same way). 🔴 U-49: its overall on
 * the 5 stars — a review whose overall is off the scale (a backend before U-49) is no review of the page (`null`).
 */
export function mapDoctorReview(
	review: DoctorPublicMarketplaceReviewPreviewView
): DoctorReviewSnippet | null {
	const rating = toStarScore(review.overallRating);
	if (rating === null) return null;
	const aspects = aspectChips(review.aspect);
	const reply = review.doctorReply?.trim();
	return {
		id: review.id,
		body: review.comment ?? '',
		patientName: review.patientName ?? '',
		patientInitial: review.patientInitial ?? '',
		publishedAt: review.createdAt,
		rating,
		...(aspects.length > 0 ? { aspects } : {}),
		...(reply ? { reply: { body: reply, repliedAt: review.doctorReplyAt ?? null } } : {})
	};
}

const PAYMENT_OPTION_IDS = {
	CARD: 'card',
	CASH: 'cash',
	IRIS: 'iris',
	ONLINE_DOCTOR_PAY: 'online-doctor-pay',
	ONLINE_OFFICE_PAY: 'online-office-pay',
	STUDENT_CARD: 'student-card',
	UNEMPLOYMENT_CARD: 'unemployment-card'
} as const satisfies Record<string, DoctorOfficePaymentOptionId>;

/** The office's payment methods as app ids; an unknown token is dropped (`Object.hasOwn`: server data). */
function paymentOptions(
	office: DoctorPublicMarketplaceProfileOfficeView
): DoctorOfficePaymentOptionId[] {
	return (office.paymentOptions ?? []).flatMap((option) =>
		Object.hasOwn(PAYMENT_OPTION_IDS, option)
			? [PAYMENT_OPTION_IDS[option as keyof typeof PAYMENT_OPTION_IDS]]
			: []
	);
}

const filled = (value: string | null | undefined): string | undefined => value?.trim() || undefined;

/**
 * One office's location facts (the profile's `selectedOffice` and the office endpoint read the same view: one
 * mapper, U-39.1). `undefined` when nothing is known.
 */
export function mapDoctorOfficeFacts(
	office: DoctorPublicMarketplaceProfileOfficeView | null | undefined
): DoctorOfficeFacts | undefined {
	if (!office) return undefined;
	const facts: DoctorOfficeFacts = {};
	const parts = {
		officeId: filled(office.officeId),
		city: filled(office.city),
		state: filled(office.state),
		street: filled(office.street),
		streetNumber: filled(office.streetNumber),
		postalCode: filled(office.postalCode),
		phone: filled(office.phone)
	};
	for (const [key, value] of Object.entries(parts)) {
		if (value) facts[key as keyof typeof parts] = value;
	}
	// `0` is the ground floor: only a non-number is absence.
	if (typeof office.floor === 'number' && Number.isFinite(office.floor)) facts.floor = office.floor;
	if (typeof office.parking === 'boolean') facts.parking = office.parking;
	if (typeof office.disabilityAccess === 'boolean')
		facts.disabilityAccess = office.disabilityAccess;
	const options = paymentOptions(office);
	if (options.length > 0) facts.paymentOptions = options;
	const { latitude, longitude } = office;
	if (
		typeof latitude === 'number' &&
		Number.isFinite(latitude) &&
		typeof longitude === 'number' &&
		Number.isFinite(longitude)
	) {
		facts.latitude = latitude;
		facts.longitude = longitude;
	}
	const description = extractParagraphs(office.description).join(' ');
	if (description) facts.description = description;
	return Object.keys(facts).length > 0 ? facts : undefined;
}

/** 🔴 U-75, U-76: the office's rules as the server resolved them; anything else is no rule (never a default of ours). */
function bookingPolicy(
	policy: DoctorPublicMarketplaceProfileOfficeSummaryView['bookingPolicy'] | undefined
): DoctorBookingPolicyFacts | undefined {
	if (!policy) return undefined;
	const { confirmationMode, cancellationCutoffHours, minBookingNoticeHours } = policy;
	if (confirmationMode !== 'AUTO' && confirmationMode !== 'MANUAL') return undefined;
	if (!isCount(cancellationCutoffHours) || !isCount(minBookingNoticeHours)) return undefined;
	return { confirmationMode, cancellationCutoffHours, minBookingNoticeHours };
}

function officeSummary(
	office:
		| (Omit<DoctorPublicMarketplaceProfileOfficeSummaryView, 'bookingPolicy'> & {
				/** The roster's offices have it; the profile's own (`selectedOffice`) does not. */
				bookingPolicy?: DoctorPublicMarketplaceProfileOfficeSummaryView['bookingPolicy'];
		  })
		| null
		| undefined
): DoctorOfficeSummaryFacts | undefined {
	const officeId = filled(office?.officeId);
	if (!office || !officeId) return undefined;
	const summary: DoctorOfficeSummaryFacts = { officeId };
	for (const key of ['city', 'postalCode', 'state', 'street', 'streetNumber'] as const) {
		const value = filled(office[key]);
		if (value) summary[key] = value;
	}
	const policy = bookingPolicy(office.bookingPolicy);
	if (policy) summary.bookingPolicy = policy;
	return summary;
}

/** Every office, the profile's own (`selectedOffice`) first, then the roster's order without it. */
function officeSummaries(doctor: DoctorPublicMarketplaceProfileView): DoctorOfficeSummaryFacts[] {
	const selected = officeSummary(doctor.selectedOffice);
	const roster = (doctor.offices ?? []).flatMap((office) => {
		const summary = officeSummary(office);
		return summary ? [summary] : [];
	});
	if (roster.length === 0) return selected ? [selected] : [];
	const lead = roster.find((office) => office.officeId === selected?.officeId) ?? selected;
	const others = roster.filter((office) => office.officeId !== selected?.officeId);
	return lead ? [lead, ...others] : others;
}

const feeOf = (price: number | null | undefined): DoctorFeeFacts | null =>
	typeof price === 'number' && Number.isFinite(price) ? { min: price, max: price } : null;

const SERVICE_KINDS: readonly DoctorServiceKind[] = ['follow-up', 'check-up', 'visit', 'other'];

/** 🔴 U-71.2, U-89.1: the backend's kind; anything this page does not know (`online` of an old server) is `other`. */
function serviceKind(kind: string | null | undefined): DoctorServiceKind {
	return SERVICE_KINDS.find((known) => known === kind) ?? 'other';
}

/** U-72.3: a positive whole number, or nothing: the page never draws a «0». */
const positive = (value: number | null | undefined): number | undefined =>
	typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined;

function services(
	list: DoctorPublicMarketplaceProfileServiceView[] | undefined
): DoctorServiceFacts[] {
	return (list ?? []).map((service, index) => {
		const facts: DoctorServiceFacts = {
			id: service.doctorServiceId || service.serviceId || `service-${index}`,
			title: service.title,
			priceRange: feeOf(service.price),
			kind: serviceKind(service.kind),
			// U-36.2: the server's own mark (the application did not read it before wave 1.5).
			isSpecialized: service.isSpecialized === true
		};
		const years = positive(service.yearsOfExperience);
		if (years) facts.yearsOfExperience = years;
		const visits = positive(service.completedVisitCount);
		if (visits) facts.completedVisits = visits;
		// 🔴 Record §6.1 (as the application's): `description` is the text, `sub` the short line; they were the wrong way round.
		const description = typeof service.description === 'string' ? service.description.trim() : '';
		if (description) facts.description = description;
		const subtitle = filled(service.sub);
		if (subtitle) facts.subtitle = subtitle;
		if (typeof service.durationInMinutes === 'number' && service.durationInMinutes > 0) {
			facts.durationInMinutes = service.durationInMinutes;
		}
		return facts;
	});
}

const CREDENTIAL_KINDS: readonly DoctorCredentialKind[] = ['STUDY', 'WORK', 'CONFERENCE'];

/**
 * 🔴 U-73.1 Ε2: the biography's entries, in the server's order; an entry of a kind this page does not know or with no
 * text is left out, and a year is a year only as a whole number. Their words are drawn as text (U-65.6).
 */
function credentials(
	list: DoctorPublicMarketplaceCredentialView[] | undefined
): DoctorCredentialFacts[] {
	return (list ?? []).flatMap((entry) => {
		const title = filled(entry.title);
		const kind = CREDENTIAL_KINDS.find((known) => known === entry.kind);
		if (!title || !kind) return [];
		const facts: DoctorCredentialFacts = {
			id: entry.id,
			kind,
			title,
			isCurrent: entry.isCurrent === true
		};
		const organization = filled(entry.organization);
		if (organization) facts.organization = organization;
		const startYear = positive(entry.startYear);
		if (startYear) facts.startYear = startYear;
		const endYear = positive(entry.endYear);
		if (endYear) facts.endYear = endYear;
		return [facts];
	});
}

const cleanList = (items: string[] | undefined) =>
	(items ?? []).map((item) => item.trim()).filter(Boolean);

function bio(doctor: DoctorPublicMarketplaceProfileView): DoctorBioFacts | undefined {
	const facts: DoctorBioFacts = {};
	const studies = cleanList(doctor.studies);
	const workExperience = cleanList(doctor.workExperience);
	const conferences = cleanList(doctor.conferences);
	if (studies.length > 0) facts.studies = studies;
	if (workExperience.length > 0) facts.workExperience = workExperience;
	if (conferences.length > 0) facts.conferences = conferences;
	return Object.keys(facts).length > 0 ? facts : undefined;
}

function languages(doctor: DoctorPublicMarketplaceProfileView): DoctorLanguageFacts[] {
	return (doctor.speakLanguages ?? []).flatMap((entry) => {
		const slug = filled(entry.slug);
		const name = filled(entry.name);
		return slug && name ? [{ slug, name }] : [];
	});
}

/** The icons' order and the only networks drawn. */
const SOCIAL_LINK_IDS = [
	'website',
	'facebook',
	'instagram',
	'linkedin'
] as const satisfies readonly DoctorSocialLinkId[];

/**
 * Every published social profile with an address the page may open (U-35.3): `http(s)` only — a `javascript:` or
 * `data:` address from the wire never reaches an `href`.
 */
function socialLinks(doctor: DoctorPublicMarketplaceProfileView): DoctorSocialLinkFacts[] {
	const links = doctor.socialLinks;
	if (!links) return [];
	return SOCIAL_LINK_IDS.flatMap((id) => {
		const url = filled(links[id]);
		return url && /^https?:\/\/[^\s]+$/iu.test(url) ? [{ id, url }] : [];
	});
}

/** One photo's sized addresses (absolute) and its description in the page's language; none without an address. */
function image(entry: DoctorImagePublicView, lang: string): DoctorImageFacts[] {
	const medium = filled(entry.mediumSizeUrl);
	const large = filled(entry.lgSizeUrl);
	const small = filled(entry.smSizeUrl);
	const main = medium ?? large ?? small;
	if (!main) return [];
	const alt = filled(
		entry.translations?.find((translation) => translation.language === lang)?.alt ??
			entry.translations?.[0]?.alt
	);
	return [
		{
			id: entry.id,
			url: resolveMediaUrl(main),
			largeUrl: resolveMediaUrl(large ?? main),
			thumbUrl: resolveMediaUrl(small ?? main),
			...(alt ? { alt } : {})
		}
	];
}

/** 🔴 U-49: the average and the aspects' averages on the 5 stars; off the scale ⇒ none. */
function ratingFacts(rating: DoctorPublicMarketplaceProfileRatingView | null | undefined) {
	const average = toStarScore(rating?.average);
	return {
		chips: aspectChips(rating?.aspectAverages),
		summary: rating && average !== null ? { count: rating.count, score: average } : undefined
	};
}

const RESPONSE_TIME_IDS = {
	FEW_DAYS: 'few-days',
	WITHIN_DAY: 'within-day',
	WITHIN_FEW_HOURS: 'within-few-hours',
	WITHIN_HOUR: 'within-hour'
} as const satisfies Record<DoctorResponseTime, DoctorResponseTimeId>;

function isCount(value: number | null, max = Number.POSITIVE_INFINITY): value is number {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max;
}

/**
 * 🔴 U-43.1–2 (app = web, the application's `buildResponseMetrics`): the six months' word, rate (0–100) and completed
 * visits as facts. Each `null`, a word this page does not know or a value out of range leaves its fact out, a `0`
 * stays (the «0%» shows); `undefined` when none is left.
 */
function buildResponseMetrics(
	metrics: DoctorPublicMarketplaceResponseMetricsView | null | undefined
): DoctorResponseMetricsFacts | undefined {
	const facts: DoctorResponseMetricsFacts = {};
	const responseTimeId =
		metrics?.responseTime && Object.hasOwn(RESPONSE_TIME_IDS, metrics.responseTime)
			? RESPONSE_TIME_IDS[metrics.responseTime]
			: undefined;
	if (responseTimeId) facts.responseTimeId = responseTimeId;
	if (metrics && isCount(metrics.responseRatePercent, 100)) {
		facts.responseRatePercent = metrics.responseRatePercent;
	}
	if (metrics && isCount(metrics.completedVisitCount)) {
		facts.completedVisits = metrics.completedVisitCount;
	}
	if (Object.keys(facts).length === 0) return undefined;
	// U-72.4: the months as the server says them; one that is no number of months is left out, not guessed.
	return metrics && isCount(metrics.windowMonths) && metrics.windowMonths > 0
		? { ...facts, windowMonths: metrics.windowMonths }
		: facts;
}

/**
 * The profile's answer as FACTS (the application's `mapDoctorProfile`, plus every photo and the services'
 * `isSpecialized`, U-36.2). A `doctor: null` answer is the 404 (`DoctorProfileNotFoundError`): the mapper never
 * makes a profile up.
 */
export function mapDoctorProfile(
	data: DoctorPublicMarketplaceProfileResponseView,
	{ slug, lang }: { slug: string; lang: string }
): DoctorProfile {
	const { doctor } = data;
	if (!doctor) throw new DoctorProfileNotFoundError(slug);
	const professionalName = filled(doctor.professional?.name);
	const serviceFacts = services(doctor.services);
	const rating = ratingFacts(doctor.rating);
	const profile: DoctorProfile = {
		doctorSlug: filled(doctor.slug) ?? slug,
		images: (doctor.images ?? []).flatMap((entry) => image(entry, lang)),
		rating: rating.summary?.score ?? 0,
		reviewCount: doctor.rating?.count ?? 0,
		pricingVisible: data.pricingVisible === true,
		fee: serviceFacts.find((service) => service.priceRange)?.priceRange ?? null,
		// 🔴 U-45.2 (app = web): the backend's verdict (≥ 4,8 stars and ≥ 5 reviews); only a `true` marks the doctor.
		isPatientsChoice: doctor.isPatientsChoice === true
	};
	const doctorId = filled(doctor.doctorId);
	if (doctorId) profile.doctorId = doctorId;
	const name = filled(doctor.fullName);
	if (name) profile.name = name;
	if (doctor.professional && professionalName) {
		profile.professional = {
			id: doctor.professional.id,
			name: professionalName,
			slug: doctor.professional.slug
		};
	}
	if (rating.summary) profile.reviewSummary = rating.summary;
	if (rating.chips.length > 0) profile.reviewChips = rating.chips;
	const snippets = (doctor.reviewsPreview ?? []).flatMap((review) => mapDoctorReview(review) ?? []);
	if (snippets.length > 0) profile.reviewSnippets = snippets;
	if (doctor.availability) {
		profile.availability = {
			hasToday: doctor.availability.hasToday,
			hasNext3Days: doctor.availability.hasNext3Days,
			nextAvailableAt: doctor.availability.nextAvailableAt
		};
	}
	if (serviceFacts.length > 0) profile.services = serviceFacts;
	const office = mapDoctorOfficeFacts(doctor.selectedOffice);
	if (office) profile.office = office;
	const offices = officeSummaries(doctor);
	if (offices.length > 0) profile.offices = offices;
	const paragraphs = extractParagraphs(doctor.description);
	if (paragraphs.length > 0) profile.description = { paragraphs };
	const entries = credentials(doctor.credentials);
	if (entries.length > 0) profile.credentials = entries;
	const bioFacts = bio(doctor);
	if (bioFacts) profile.bio = bioFacts;
	const spoken = languages(doctor);
	if (spoken.length > 0) profile.languages = spoken;
	const links = socialLinks(doctor);
	if (links.length > 0) profile.socialLinks = links;
	const licenseNumber = filled(doctor.licenseNumber);
	if (licenseNumber) profile.licenseNumber = licenseNumber;
	if (doctor.licenseObtainedDate) profile.licenseObtainedDate = doctor.licenseObtainedDate;
	if (doctor.memberSince) profile.memberSince = doctor.memberSince;
	const responseMetrics = buildResponseMetrics(doctor.responseMetrics);
	if (responseMetrics) profile.responseMetrics = responseMetrics;
	const articles = doctor.articlesSummary;
	if (articles && (isCount(articles.articlesCount) || isCount(articles.healthAdviceCount))) {
		profile.articlesSummary = {
			articlesCount: isCount(articles.articlesCount) ? articles.articlesCount : 0,
			healthAdviceCount: isCount(articles.healthAdviceCount) ? articles.healthAdviceCount : 0
		};
	}
	return profile;
}
