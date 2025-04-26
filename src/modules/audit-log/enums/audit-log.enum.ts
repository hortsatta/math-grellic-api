export enum AuditFeatureType {
  user = 'user',
  schoolYear = 'school-year',
  exam = 'exam',
  lesson = 'lesson',
  activity = 'activity',
}

export enum AuditUserAction {
  registerUser = 'register-user',
  updateUser = 'update-user',
  deleteUser = 'delete-user',
  setApprovalStatus = 'set-approval-status',
  createSchoolYear = 'create-school-year',
  updateSchoolYear = 'update-school-year',
  deleteSchoolYear = 'delete-school-year',
}
