export { changeDoctorCredentialGroup, getDoctorCredentials } from './endpoints';
export { DoctorCredentialRefusal, readDoctorCredentialsFailure } from './failure';
export { mapDoctorCredentials, toDoctorCredentialsBody } from './map';
export { doctorCredentialsQuery } from './queries';
export type {
	DoctorCredentialFacts,
	DoctorCredentialGroupChange,
	DoctorCredentialItem,
	DoctorCredentialKind,
	DoctorCredentialsBody,
	DoctorCredentialsFailure,
	DoctorCredentialsView
} from './types';
