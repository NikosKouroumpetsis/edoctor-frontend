export {
	getDoctorSpecializationOptions,
	getDoctorSpecializations,
	replaceDoctorSpecializations
} from './endpoints';
export { readDoctorSpecializationsFailure } from './failure';
export { mapDoctorSpecializationOptions, mapDoctorSpecializations } from './map';
export { doctorSpecializationOptionsQuery, doctorSpecializationsQuery } from './queries';
export type {
	DoctorSpecializationFacts,
	DoctorSpecializationKind,
	DoctorSpecializationOptionFacts,
	DoctorSpecializationsFailure,
	DoctorSpecializationStatus
} from './types';
