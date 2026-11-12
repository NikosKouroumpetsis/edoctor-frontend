/** The doctor's photo on the patient's appointment screens (50–54): what to show, and the box the caller sizes. */
export type DoctorPhotoProps = {
	/** The profile's photo; `null` for a doctor without one (the silhouette). */
	photo: { src: string; alt: string } | null;
	/** The box: its size (a `size-*` name); the 8 corner is the component's. */
	class?: string;
	testId?: string;
};
