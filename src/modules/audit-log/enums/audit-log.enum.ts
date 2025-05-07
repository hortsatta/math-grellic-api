export enum AuditFeatureType {
  user = 'user',
  schoolYear = 'school-year',
  schoolYearEnrollment = 'school-year-enrollment',
  exam = 'exam',
  lesson = 'lesson',
  activity = 'activity',
}

export enum AuditUserAction {
  registerUser = 'register-user',
  updateUser = 'update-user',
  deleteUser = 'delete-user',
  setApprovalStatus = 'set-approval-status',
  setEnrollmentApprovalStatus = 'set-enrollment-approval-status',
  createSchoolYear = 'create-school-year',
  updateSchoolYear = 'update-school-year',
  deleteSchoolYear = 'delete-school-year',
}
