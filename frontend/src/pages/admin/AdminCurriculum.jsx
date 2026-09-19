import CurriculumManager from '../../components/CurriculumManager';

// Admin view: same curriculum management UI, but the backend returns programs
// across ALL departments for an admin.
export default function AdminCurriculum() {
  return (
    <div className="page">
      <CurriculumManager />
    </div>
  );
}
