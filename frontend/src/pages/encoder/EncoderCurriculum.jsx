import CurriculumManager from '../../components/CurriculumManager';

// Encoder view: manage curricula for programs in the encoder's own department
// (the backend scopes /encoder/programs/ to their department).
export default function EncoderCurriculum() {
  return <CurriculumManager />;
}
