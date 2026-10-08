import RoleUserManager from './RoleUserManager';

const CONFIG = {
  singular: 'Faculty',
  plural: 'faculty',
  titleLead: 'Faculty',
  titleEm: 'accounts',
  sub: 'View, search, and manually add faculty accounts, including their department and GEC classification.',
  addSub: 'Create a faculty account. It is pre-verified, so the instructor can log in right away.',
  addIcon: 'ti-user-plus',
  emptyIcon: 'ti-chalkboard',
  idLabel: 'Employee ID',
  idPlaceholder: 'e.g. FAC-00010',
  emailPlaceholder: 'grace.lim@nemsu.edu.ph',
};

export default function AdminFaculty() {
  return <RoleUserManager role="faculty" config={CONFIG} />;
}
