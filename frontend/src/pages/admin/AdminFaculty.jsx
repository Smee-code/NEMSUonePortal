import RoleUserManager from './RoleUserManager';

const CONFIG = {
  singular: 'Faculty',
  plural: 'faculty',
  titleLead: 'Faculty',
  titleEm: 'accounts',
  sub: 'View, search, and add faculty accounts. Enter the essentials — the Faculty ID and a temporary password are generated and emailed automatically.',
  addSub: 'Enter the faculty’s details. Their ID and a temporary password are generated and emailed to them.',
  addIcon: 'ti-user-plus',
  emptyIcon: 'ti-chalkboard',
  idLabel: 'Faculty ID',
  idPlaceholder: 'e.g. FAC-00010',
  emailPlaceholder: 'grace.lim@nemsu.edu.ph',
  autoCreate: true,
};

export default function AdminFaculty() {
  return <RoleUserManager role="faculty" config={CONFIG} />;
}
