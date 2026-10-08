import RoleUserManager from './RoleUserManager';

const CONFIG = {
  singular: 'Student',
  plural: 'students',
  titleLead: 'Student',
  titleEm: 'accounts',
  sub: 'View, search, and manually add student accounts. New students can also self-register and verify by email.',
  addSub: 'Create a student account. It is pre-verified, so the student can log in right away.',
  addIcon: 'ti-user-plus',
  emptyIcon: 'ti-users',
  idLabel: 'Student ID',
  idPlaceholder: 'e.g. 2026-00123',
  emailPlaceholder: 'jdelacruz@nemsu.edu.ph',
};

export default function AdminStudents() {
  return <RoleUserManager role="student" config={CONFIG} />;
}
