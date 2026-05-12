import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import EnrollmentScheduleManager from '../../components/EnrollmentScheduleManager';

// ── Constants ─────────────────────────────────────────────────────────────────

const YEAR_LEVEL_OPTIONS = [
  { value: '', label: '— None —' },
  { value: 1, label: '1st Year' },
  { value: 2, label: '2nd Year' },
  { value: 3, label: '3rd Year' },
  { value: 4, label: '4th Year' },
];

const SEMESTER_OPTIONS = [
  { value: '', label: '— None —' },
  { value: 'first', label: '1st Semester' },
  { value: 'second', label: '2nd Semester' },
  { value: 'summer', label: 'Summer' },
];

const YEAR_LABELS = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };
const SEM_LABELS = { first: '1st Semester', second: '2nd Semester', summer: 'Summer' };
const SUBJECT_TYPE_OPTIONS = [
  { value: 'major', label: 'Major Subject' },
  { value: 'minor', label: 'Minor Subject' },
];
const SUBJECT_TYPE_LABELS = { major: 'Major Subject', minor: 'Minor Subject' };
const SEM_ORDER = ['first', 'second', 'summer'];

const ACCEPTED_EXTENSIONS = '.csv,.pdf,.xlsx,.xls,.docx,.doc,.pptx,.ppt,.odt,.ods,.txt';
const ACCEPTED_LABEL = 'PDF, Word, Excel, PowerPoint, CSV, ODT, ODS, TXT (max 10 MB)';

const CSV_TEMPLATE =
  'year_level,semester,code,name,units,subject_type,prerequisite_code,description\n' +
  '1,first,CC101,Introduction to Computing,3,minor,,Fundamentals of computer systems\n' +
  '1,first,CC102,Computer Programming 1,3,major,,\n' +
  '1,second,CC103,Computer Programming 2,3,major,CC102,\n' +
  '2,first,CC201,Data Structures and Algorithms,3,major,CC103,\n' +
  '2,second,IT202,Platform Technologies,1.25,minor,,\n';

// ── Helpers ───────────────────────────────────────────────────────────────────

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'curriculum_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function groupByYearSemester(subjects) {
  const grouped = {};
  subjects.forEach(s => {
    const yr = s.year_level ?? 0;
    const sem = s.semester ?? '';
    if (!grouped[yr]) grouped[yr] = {};
    if (!grouped[yr][sem]) grouped[yr][sem] = [];
    grouped[yr][sem].push(s);
  });
  return grouped;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUnits(val) {
  const n = parseFloat(val);
  if (Number.isNaN(n)) return '0';
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function validateUnits(val) {
  const raw = String(val).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return false;
  const n = parseFloat(raw);
  return !isNaN(n) && n >= 0.5 && n <= 12;
}

function normalizeUnits(val) {
  return formatUnits(val);
}

function prerequisiteLabel(subject) {
  return subject?.prerequisite_code
    ? `${subject.prerequisite_code} - ${subject.prerequisite_name || 'Prerequisite'}`
    : '-';
}

// ── Shared components ─────────────────────────────────────────────────────────

function Modal({ title, subtitle, onClose, wide, children }) {
  return (
    <div style={s.overlay}>
      <div style={{ ...s.modal, maxWidth: wide ? 820 : 520 }}>
        <div style={s.modalHeader}>
          <div>
            <h2 style={s.modalTitle}>{title}</h2>
            {subtitle && <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#6b7280' }}>{subtitle}</p>}
          </div>
          <button style={s.modalClose} onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SectionHeader({ title, count, onAdd }) {
  return (
    <div style={s.sectionHeader}>
      <div>
        <span style={s.sectionTitle}>{title}</span>
        {count != null && <span style={s.sectionCount}>{count}</span>}
      </div>
      <button style={s.btnPrimary} onClick={onAdd}>+ Add</button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function SearchableSelect({ value, options, onChange, placeholder = 'Search or select...' }) {
  const blurTimer = useRef(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(options.find(o => String(o.value) === String(value))?.label || '');
  }, [options, value]);

  const selectedLabel = options.find(o => String(o.value) === String(value))?.label || '';
  const normalizedQuery = query.trim().toLowerCase();
  const visibleOptions = !normalizedQuery || query === selectedLabel
    ? options
    : options.filter(o => o.label.toLowerCase().includes(normalizedQuery));

  const selectOption = (option) => {
    onChange(option.value);
    setQuery(option.label);
    setOpen(false);
  };

  return (
    <div style={s.combo}>
      <input
        style={{ ...s.input, paddingRight: '2rem' }}
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={e => {
          if (blurTimer.current) clearTimeout(blurTimer.current);
          setOpen(true);
          e.target.select();
        }}
        onChange={e => {
          setQuery(e.target.value);
          setOpen(true);
          const match = options.find(o => o.label.toLowerCase() === e.target.value.trim().toLowerCase());
          if (match) onChange(match.value);
          if (!e.target.value.trim()) onChange('');
        }}
        onBlur={() => {
          blurTimer.current = setTimeout(() => {
            const match = options.find(o => o.label.toLowerCase() === query.trim().toLowerCase());
            setQuery(match?.label || selectedLabel);
            setOpen(false);
          }, 120);
        }}
      />
      <button
        type="button"
        style={s.comboButton}
        onMouseDown={e => e.preventDefault()}
        onClick={() => setOpen(v => !v)}
      >
        ▼
      </button>
      {open && (
        <div style={s.comboMenu}>
          {visibleOptions.length ? visibleOptions.map(o => (
            <button
              key={o.value || '__none'}
              type="button"
              style={{
                ...s.comboOption,
                ...(String(o.value) === String(value) ? s.comboOptionActive : {}),
              }}
              onMouseDown={e => e.preventDefault()}
              onClick={() => selectOption(o)}
            >
              {o.label}
            </button>
          )) : (
            <div style={s.comboEmpty}>No matches found</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminPrograms() {
  const { user, logout } = useAuth();

  // ── Department state ──────────────────────────────────────────────────────
  const [depts, setDepts] = useState([]);
  const [deptsLoading, setDeptsLoading] = useState(false);
  const [deptModal, setDeptModal] = useState(null);
  const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '', is_active: true });
  const [deptError, setDeptError] = useState('');
  const [deptSaving, setDeptSaving] = useState(false);
  const [deletingDept, setDeletingDept] = useState(null);

  // ── Program state ─────────────────────────────────────────────────────────
  const [programs, setPrograms] = useState([]);
  const [programsLoading, setProgramsLoading] = useState(false);
  const [programDeptFilter, setProgramDeptFilter] = useState('');
  const [programModal, setProgramModal] = useState(null);
  const [programForm, setProgramForm] = useState({ name: '', code: '', department: '', description: '', is_active: true });
  const [programError, setProgramError] = useState('');
  const [programSaving, setProgramSaving] = useState(false);
  const [deletingProgram, setDeletingProgram] = useState(null);

  // ── Subject state ─────────────────────────────────────────────────────────
  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectProgramFilter, setSubjectProgramFilter] = useState('');
  const [subjectModal, setSubjectModal] = useState(null);
  const [subjectForm, setSubjectForm] = useState({
    code: '', name: '', units: '', description: '',
    is_active: true, program: '', year_level: '', semester: '',
    subject_type: 'minor', prerequisite: '',
  });
  const [subjectError, setSubjectError] = useState('');
  const [subjectSaving, setSubjectSaving] = useState(false);
  const [deletingSubject, setDeletingSubject] = useState(null);

  // ── Table search ──────────────────────────────────────────────────────────
  const [deptSearch, setDeptSearch] = useState('');
  const [programSearch, setProgramSearch] = useState('');
  const [subjectSearch, setSubjectSearch] = useState('');

  // ── Curriculum modal state ────────────────────────────────────────────────
  const [curriculumProgram, setCurriculumProgram] = useState(null);
  const [curriculumSubjects, setCurriculumSubjects] = useState([]);
  const [curriculumLoading, setCurriculumLoading] = useState(false);
  const [curriculumTab, setCurriculumTab] = useState('view');

  // Edit subject inline in curriculum
  const [editingCurrSubject, setEditingCurrSubject] = useState(null);
  const [editCurrForm, setEditCurrForm] = useState({ code: '', name: '', units: '', description: '', year_level: '', semester: '', subject_type: 'minor', prerequisite: '' });
  const [editCurrError, setEditCurrError] = useState('');
  const [editCurrSaving, setEditCurrSaving] = useState(false);
  const [deletingCurrSubject, setDeletingCurrSubject] = useState(null);

  // Upload tab (multi-format)
  const [currDocs, setCurrDocs] = useState([]);
  const [currDocsLoading, setCurrDocsLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [deletingDoc, setDeletingDoc] = useState(null);
  const fileInputRef = useRef(null);

  // Add tab
  const [addForm, setAddForm] = useState({ code: '', name: '', units: '', description: '', year_level: '', semester: '', subject_type: 'minor', prerequisite: '' });
  const [addError, setAddError] = useState('');
  const [addSaving, setAddSaving] = useState(false);

  const [pageError, setPageError] = useState('');

  // ── Data fetchers ─────────────────────────────────────────────────────────

  const fetchDepts = () => {
    setDeptsLoading(true);
    api.get('/enrollment/admin/departments/')
      .then(r => setDepts(r.data))
      .catch(() => setPageError('Failed to load departments.'))
      .finally(() => setDeptsLoading(false));
  };

  const fetchPrograms = (deptId = '') => {
    setProgramsLoading(true);
    const url = deptId ? `/enrollment/admin/programs/?department=${deptId}` : '/enrollment/admin/programs/';
    api.get(url)
      .then(r => setPrograms(r.data))
      .catch(() => setPageError('Failed to load programs.'))
      .finally(() => setProgramsLoading(false));
  };

  const fetchSubjects = (programId = '') => {
    setSubjectsLoading(true);
    const url = programId ? `/enrollment/admin/subjects/?program=${programId}` : '/enrollment/admin/subjects/';
    api.get(url)
      .then(r => setSubjects(r.data))
      .catch(() => setPageError('Failed to load subjects.'))
      .finally(() => setSubjectsLoading(false));
  };

  const fetchCurriculumSubjects = (programId) => {
    setCurriculumLoading(true);
    api.get(`/enrollment/admin/subjects/?program=${programId}`)
      .then(r => setCurriculumSubjects(r.data))
      .catch(() => setPageError('Failed to load curriculum.'))
      .finally(() => setCurriculumLoading(false));
  };

  const fetchCurrDocs = (programId) => {
    setCurrDocsLoading(true);
    api.get(`/enrollment/admin/programs/${programId}/documents/`)
      .then(r => setCurrDocs(r.data))
      .catch(() => {})
      .finally(() => setCurrDocsLoading(false));
  };

  useEffect(() => { fetchDepts(); fetchPrograms(); fetchSubjects(); }, []);

  // ── Department CRUD ───────────────────────────────────────────────────────

  const openAddDept = () => { setDeptForm({ name: '', code: '', description: '', is_active: true }); setDeptError(''); setDeptModal('add'); };
  const openEditDept = (d) => { setDeptForm({ name: d.name, code: d.code, description: d.description, is_active: d.is_active }); setDeptError(''); setDeptModal(d); };

  const saveDept = async () => {
    if (!deptForm.name.trim() || !deptForm.code.trim()) { setDeptError('Name and code are required.'); return; }
    setDeptSaving(true); setDeptError('');
    try {
      deptModal === 'add'
        ? await api.post('/enrollment/admin/departments/', deptForm)
        : await api.patch(`/enrollment/admin/departments/${deptModal.id}/`, deptForm);
      setDeptModal(null); fetchDepts(); fetchPrograms(programDeptFilter);
    } catch (err) {
      const d = err.response?.data;
      setDeptError(d?.name?.[0] || d?.code?.[0] || d?.detail || d?.error || 'Failed to save.');
    } finally { setDeptSaving(false); }
  };

  const deleteDept = async (dept) => {
    if (!window.confirm(`Delete department "${dept.name}"?`)) return;
    setDeletingDept(dept.id); setPageError('');
    try { await api.delete(`/enrollment/admin/departments/${dept.id}/`); fetchDepts(); }
    catch (err) { setPageError(err.response?.data?.detail || err.response?.data?.error || 'Failed to delete department.'); }
    finally { setDeletingDept(null); }
  };

  // ── Program CRUD ──────────────────────────────────────────────────────────

  const openAddProgram = () => { setProgramForm({ name: '', code: '', department: programDeptFilter || '', description: '', is_active: true }); setProgramError(''); setProgramModal('add'); };
  const openEditProgram = (p) => { setProgramForm({ name: p.name, code: p.code, department: p.department, description: p.description, is_active: p.is_active }); setProgramError(''); setProgramModal(p); };

  const saveProgram = async () => {
    if (!programForm.name.trim() || !programForm.code.trim() || !programForm.department) { setProgramError('Name, code, and department are required.'); return; }
    setProgramSaving(true); setProgramError('');
    try {
      programModal === 'add'
        ? await api.post('/enrollment/admin/programs/', programForm)
        : await api.patch(`/enrollment/admin/programs/${programModal.id}/`, programForm);
      setProgramModal(null); fetchPrograms(programDeptFilter); fetchDepts();
    } catch (err) {
      const d = err.response?.data;
      setProgramError(d?.name?.[0] || d?.code?.[0] || d?.department?.[0] || d?.detail || d?.error || 'Failed to save.');
    } finally { setProgramSaving(false); }
  };

  const deleteProgram = async (prog) => {
    if (!window.confirm(`Delete program "${prog.name}"? Subjects in it will become unassigned.`)) return;
    setDeletingProgram(prog.id); setPageError('');
    try { await api.delete(`/enrollment/admin/programs/${prog.id}/`); fetchPrograms(programDeptFilter); fetchDepts(); }
    catch (err) { setPageError(err.response?.data?.detail || err.response?.data?.error || 'Failed to delete program.'); }
    finally { setDeletingProgram(null); }
  };

  // ── Curriculum modal ──────────────────────────────────────────────────────

  const openCurriculum = (prog) => {
    setCurriculumProgram(prog);
    setCurriculumTab('view');
    setEditingCurrSubject(null);
    setUploadFile(null); setUploadResult(null);
    setAddForm({ code: '', name: '', units: '', description: '', year_level: '', semester: '', subject_type: 'minor', prerequisite: '' });
    setAddError('');
    fetchCurriculumSubjects(prog.id);
    fetchCurrDocs(prog.id);
  };

  const closeCurriculum = () => {
    setCurriculumProgram(null);
    fetchSubjects(subjectProgramFilter);
    fetchPrograms(programDeptFilter);
  };

  // Edit subject in curriculum
  const openEditCurrSubject = (subj) => {
    setEditingCurrSubject(subj);
    setEditCurrForm({
      code: subj.code,
      name: subj.name,
      units: subj.units,
      description: subj.description || '',
      year_level: subj.year_level ?? '',
      semester: subj.semester ?? '',
      subject_type: subj.subject_type || 'minor',
      prerequisite: subj.prerequisite ?? '',
    });
    setEditCurrError('');
  };

  const saveEditCurrSubject = async () => {
    if (!editCurrForm.code.trim() || !editCurrForm.name.trim()) { setEditCurrError('Code and name are required.'); return; }
    if (!validateUnits(editCurrForm.units)) { setEditCurrError('Units must be a number between 0.5 and 12 with at most 2 decimal places.'); return; }
    setEditCurrSaving(true); setEditCurrError('');
    try {
      await api.patch(`/enrollment/admin/subjects/${editingCurrSubject.id}/`, {
        code: editCurrForm.code.trim().toUpperCase(),
        name: editCurrForm.name.trim(),
        units: normalizeUnits(editCurrForm.units),
        description: editCurrForm.description.trim(),
        year_level: editCurrForm.year_level !== '' ? Number(editCurrForm.year_level) : null,
        semester: editCurrForm.semester || null,
        subject_type: editCurrForm.subject_type || 'minor',
        prerequisite: editCurrForm.prerequisite || null,
      });
      setEditingCurrSubject(null);
      fetchCurriculumSubjects(curriculumProgram.id);
    } catch (err) {
      const d = err.response?.data;
      setEditCurrError(d?.code?.[0] || d?.name?.[0] || d?.units?.[0] || d?.subject_type?.[0] || d?.prerequisite?.[0] || d?.detail || d?.error || 'Failed to save.');
    } finally { setEditCurrSaving(false); }
  };

  const handleDeleteCurrSubject = async (subj) => {
    if (!window.confirm(`Remove "${subj.code} — ${subj.name}" from this curriculum?\nThis deletes the subject if it has no enrollment or grade records.`)) return;
    setDeletingCurrSubject(subj.id);
    try {
      await api.delete(`/enrollment/admin/subjects/${subj.id}/`);
      setCurriculumSubjects(prev => prev.filter(s => s.id !== subj.id));
    } catch {
      // If protected, unlink from program instead
      await api.patch(`/enrollment/admin/subjects/${subj.id}/`, { program: null, year_level: null, semester: null })
        .then(() => setCurriculumSubjects(prev => prev.filter(s => s.id !== subj.id)))
        .catch(e2 => setPageError(e2.response?.data?.detail || e2.response?.data?.error || 'Failed to remove subject.'));
    } finally { setDeletingCurrSubject(null); }
  };

  // Upload (multi-format)
  const handleUploadFile = async () => {
    if (!uploadFile) return;
    const formData = new FormData();
    formData.append('file', uploadFile);
    setUploading(true); setUploadResult(null);
    try {
      const res = await api.post(
        `/enrollment/admin/programs/${curriculumProgram.id}/documents/`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setUploadResult(res.data);
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchCurrDocs(curriculumProgram.id);
      if (res.data.import) fetchCurriculumSubjects(curriculumProgram.id);
    } catch (err) {
      setUploadResult({ error: err.response?.data?.error || 'Upload failed.' });
    } finally { setUploading(false); }
  };

  const handleDeleteDoc = async (doc) => {
    if (!window.confirm(`Delete "${doc.file_name}"?`)) return;
    setDeletingDoc(doc.id);
    try {
      await api.delete(`/enrollment/admin/programs/${curriculumProgram.id}/documents/${doc.id}/`);
      setCurrDocs(prev => prev.filter(d => d.id !== doc.id));
    } catch (err) {
      setPageError(err.response?.data?.error || 'Failed to delete document.');
    } finally { setDeletingDoc(null); }
  };

  // Add manually
  const handleAddSubject = async () => {
    if (!addForm.code.trim() || !addForm.name.trim()) { setAddError('Code and name are required.'); return; }
    if (!validateUnits(addForm.units)) { setAddError('Units must be a number between 0.5 and 12 with at most 2 decimal places (e.g. 1, 1.25, 3).'); return; }
    setAddSaving(true); setAddError('');
    try {
      await api.post('/enrollment/admin/subjects/', {
        code: addForm.code.trim().toUpperCase(),
        name: addForm.name.trim(),
        units: normalizeUnits(addForm.units),
        description: addForm.description.trim(),
        is_active: true,
        program: curriculumProgram.id,
        year_level: addForm.year_level !== '' ? Number(addForm.year_level) : null,
        semester: addForm.semester || null,
        subject_type: addForm.subject_type || 'minor',
        prerequisite: addForm.prerequisite || null,
      });
      setAddForm({ code: '', name: '', units: '', description: '', year_level: '', semester: '', subject_type: 'minor', prerequisite: '' });
      fetchCurriculumSubjects(curriculumProgram.id);
    } catch (err) {
      const d = err.response?.data;
      setAddError(d?.code?.[0] || d?.name?.[0] || d?.units?.[0] || d?.subject_type?.[0] || d?.prerequisite?.[0] || d?.detail || d?.error || d?.[0] || 'Failed to add subject.');
    } finally { setAddSaving(false); }
  };

  // ── Subject CRUD (standalone section) ────────────────────────────────────

  const openAddSubject = () => {
    setSubjectForm({ code: '', name: '', units: '', description: '', is_active: true, program: subjectProgramFilter || '', year_level: '', semester: '', subject_type: 'minor', prerequisite: '' });
    setSubjectError(''); setSubjectModal('add');
  };
  const openEditSubject = (subj) => {
    setSubjectForm({ code: subj.code, name: subj.name, units: subj.units, description: subj.description, is_active: subj.is_active, program: subj.program ?? '', year_level: subj.year_level ?? '', semester: subj.semester ?? '', subject_type: subj.subject_type || 'minor', prerequisite: subj.prerequisite ?? '' });
    setSubjectError(''); setSubjectModal(subj);
  };

  const saveSubject = async () => {
    if (!subjectForm.code.trim() || !subjectForm.name.trim()) { setSubjectError('Code and name are required.'); return; }
    if (!validateUnits(subjectForm.units)) { setSubjectError('Units must be a number between 0.5 and 12 with at most 2 decimal places (e.g. 1, 1.25, 3).'); return; }
    setSubjectSaving(true); setSubjectError('');
    const payload = {
      ...subjectForm,
      units: normalizeUnits(subjectForm.units),
      program: subjectForm.program || null,
      year_level: subjectForm.year_level !== '' ? Number(subjectForm.year_level) : null,
      semester: subjectForm.semester || null,
      prerequisite: subjectForm.prerequisite || null,
    };
    try {
      subjectModal === 'add'
        ? await api.post('/enrollment/admin/subjects/', payload)
        : await api.patch(`/enrollment/admin/subjects/${subjectModal.id}/`, payload);
      setSubjectModal(null); fetchSubjects(subjectProgramFilter); fetchPrograms(programDeptFilter);
    } catch (err) {
      const d = err.response?.data;
      setSubjectError(d?.code?.[0] || d?.name?.[0] || d?.units?.[0] || d?.subject_type?.[0] || d?.prerequisite?.[0] || d?.[0] || d?.detail || d?.error || 'Failed to save.');
    } finally { setSubjectSaving(false); }
  };

  const deleteSubject = async (subj) => {
    if (!window.confirm(`Delete subject "${subj.code}"? Deactivate it instead if it has records.`)) return;
    setDeletingSubject(subj.id); setPageError('');
    try { await api.delete(`/enrollment/admin/subjects/${subj.id}/`); fetchSubjects(subjectProgramFilter); }
    catch (err) { setPageError(err.response?.data?.[0] || err.response?.data?.detail || err.response?.data?.error || 'Failed to delete subject.'); }
    finally { setDeletingSubject(null); }
  };

  // ── Curriculum tab renders ────────────────────────────────────────────────

  const curriculumPrerequisiteOptions = (excludeId = null) =>
    curriculumSubjects.filter(s => s.id !== excludeId);

  const subjectPrerequisiteOptions = (programId, excludeId = null) =>
    subjects.filter(s => {
      if (s.id === excludeId) return false;
      if (!programId) return true;
      return String(s.program) === String(programId);
    });

  const programSelectOptions = [
    { value: '', label: '— None —' },
    ...programs.map(p => ({ value: p.id, label: `${p.code} — ${p.name}` })),
  ];

  const prerequisiteSelectOptions = [
    { value: '', label: 'None' },
    ...subjectPrerequisiteOptions(subjectForm.program, subjectModal?.id)
      .map(subj => ({ value: subj.id, label: `${subj.code} - ${subj.name}` })),
  ];

  const renderCurriculumView = () => {
    if (curriculumLoading) return <p style={s.loading}>Loading curriculum…</p>;
    if (curriculumSubjects.length === 0) return (
      <p style={s.empty}>No subjects yet. Use <strong>Upload File</strong> or <strong>Add Manually</strong> to build the curriculum.</p>
    );

    const grouped = groupByYearSemester(curriculumSubjects);
    const years = Object.keys(grouped).map(Number).sort((a, b) => a - b);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {years.map(yr => {
          const sems = grouped[yr];
          const semKeys = Object.keys(sems).sort((a, b) => SEM_ORDER.indexOf(a) - SEM_ORDER.indexOf(b));
          return (
            <div key={yr} style={s.currYearBlock}>
              <div style={s.currYearLabel}>{yr === 0 ? 'Unassigned' : YEAR_LABELS[yr]}</div>
              {semKeys.map(sem => (
                <div key={sem} style={{ marginTop: '0.6rem' }}>
                  {sem && <div style={s.currSemLabel}>{SEM_LABELS[sem] || sem}</div>}
                  <table style={s.table}>
                    <thead>
                      <tr>
                        <th style={s.th}>Code</th>
                        <th style={s.th}>Subject Name</th>
                        <th style={{ ...s.th, textAlign: 'center' }}>Units</th>
                        <th style={s.th}>Prerequisite</th>
                        <th style={s.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sems[sem].map(subj => (
                        editingCurrSubject?.id === subj.id ? (
                          <tr key={subj.id} style={{ ...s.tr, background: '#f0f9ff' }}>
                            <td style={s.td} colSpan={5}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 0.6fr 1fr 1fr', gap: '0.5rem', alignItems: 'end' }}>
                                <div>
                                  <label style={s.inlineLabel}>Code</label>
                                  <input style={s.inlineInput} value={editCurrForm.code} onChange={e => setEditCurrForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} maxLength={20} />
                                </div>
                                <div>
                                  <label style={s.inlineLabel}>Name</label>
                                  <input style={s.inlineInput} value={editCurrForm.name} onChange={e => setEditCurrForm(f => ({ ...f, name: e.target.value }))} />
                                </div>
                                <div>
                                  <label style={s.inlineLabel}>Units</label>
                                  <input style={s.inlineInput} type="number" min={0.5} max={12} step={0.01} value={editCurrForm.units} onChange={e => setEditCurrForm(f => ({ ...f, units: e.target.value }))} />
                                </div>
                                <div>
                                  <label style={s.inlineLabel}>Year</label>
                                  <select style={s.inlineInput} value={editCurrForm.year_level} onChange={e => setEditCurrForm(f => ({ ...f, year_level: e.target.value }))}>
                                    {YEAR_LEVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label style={s.inlineLabel}>Semester</label>
                                  <select style={s.inlineInput} value={editCurrForm.semester} onChange={e => setEditCurrForm(f => ({ ...f, semester: e.target.value }))}>
                                    {SEMESTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                  </select>
                                </div>
                              </div>
                              <div style={{ marginTop: '0.5rem' }}>
                                <label style={s.inlineLabel}>Subject Type</label>
                                <select style={{ ...s.inlineInput, width: '100%' }} value={editCurrForm.subject_type} onChange={e => setEditCurrForm(f => ({ ...f, subject_type: e.target.value }))}>
                                  {SUBJECT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                              </div>
                              <div style={{ marginTop: '0.5rem' }}>
                                <label style={s.inlineLabel}>Description</label>
                                <input style={{ ...s.inlineInput, width: '100%' }} value={editCurrForm.description} onChange={e => setEditCurrForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional" />
                              </div>
                              <div style={{ marginTop: '0.5rem' }}>
                                <label style={s.inlineLabel}>Prerequisite</label>
                                <select style={{ ...s.inlineInput, width: '100%' }} value={editCurrForm.prerequisite} onChange={e => setEditCurrForm(f => ({ ...f, prerequisite: e.target.value }))}>
                                  <option value="">None</option>
                                  {curriculumPrerequisiteOptions(editingCurrSubject?.id).map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                                </select>
                              </div>
                              {editCurrError && <p style={{ ...s.formError, marginTop: '0.35rem' }}>{editCurrError}</p>}
                              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
                                <button style={{ ...s.btnSm, ...s.btnSmPrimary }} onClick={saveEditCurrSubject} disabled={editCurrSaving}>
                                  {editCurrSaving ? 'Saving…' : 'Save'}
                                </button>
                                <button style={s.btnSm} onClick={() => setEditingCurrSubject(null)}>Cancel</button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          <tr key={subj.id} style={s.tr}>
                            <td style={s.td}><code style={s.code}>{subj.code}</code></td>
                            <td style={s.td}>{subj.name}</td>
                            <td style={{ ...s.td, textAlign: 'center' }}>{formatUnits(subj.units)}</td>
                            <td style={s.td}>{prerequisiteLabel(subj)}</td>
                            <td style={s.td}>
                              <button style={{ ...s.btnSm, ...s.btnSmEdit }} onClick={() => openEditCurrSubject(subj)}>Edit</button>
                              <button
                                style={{ ...s.btnSm, ...s.btnSmDanger }}
                                disabled={deletingCurrSubject === subj.id}
                                onClick={() => handleDeleteCurrSubject(subj)}
                              >
                                {deletingCurrSubject === subj.id ? '…' : 'Remove'}
                              </button>
                            </td>
                          </tr>
                        )
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          );
        })}
        <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.5rem' }}>
          Total: {curriculumSubjects.length} subject(s) · {formatUnits(curriculumSubjects.reduce((a, s) => a + parseFloat(s.units || 0), 0))} units
        </p>
      </div>
    );
  };

  const renderUploadTab = () => (
    <div>
      {/* Uploaded documents */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e3a5f', marginBottom: '0.6rem' }}>
          Uploaded Curriculum Files
        </div>
        {currDocsLoading ? (
          <p style={s.loading}>Loading…</p>
        ) : currDocs.length === 0 ? (
          <p style={s.empty}>No files uploaded yet.</p>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>File Name</th>
                <th style={s.th}>Size</th>
                <th style={s.th}>Uploaded</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currDocs.map(doc => (
                <tr key={doc.id} style={s.tr}>
                  <td style={s.td}>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ color: '#1e3a5f', textDecoration: 'underline' }}>
                      {doc.file_name}
                    </a>
                  </td>
                  <td style={s.td}>{formatFileSize(doc.file_size)}</td>
                  <td style={s.td}>{new Date(doc.uploaded_at).toLocaleDateString()}</td>
                  <td style={s.td}>
                    <a href={doc.url} download style={{ ...s.btnSm, textDecoration: 'none', display: 'inline-block', marginRight: '0.35rem' }}>
                      Download
                    </a>
                    <button
                      style={{ ...s.btnSm, ...s.btnSmDanger }}
                      disabled={deletingDoc === doc.id}
                      onClick={() => handleDeleteDoc(doc)}
                    >
                      {deletingDoc === doc.id ? '…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Upload new file */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.25rem' }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e3a5f', marginBottom: '0.6rem' }}>
          Upload New File
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.85rem 1rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#374151' }}>
          <strong>Accepted formats:</strong> {ACCEPTED_LABEL}
          <br />
          <span style={{ color: '#6b7280' }}>CSV files will also automatically import subjects into the curriculum.</span>
        </div>

        <button
          style={{ ...s.btnSecondary, marginBottom: '0.85rem', fontSize: '0.82rem' }}
          onClick={downloadTemplate}
        >
          Download CSV Template
        </button>

        <div style={s.fieldGroup}>
          <label style={s.label}>Select File</label>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            style={{ fontSize: '0.9rem' }}
            onChange={e => { setUploadFile(e.target.files[0] || null); setUploadResult(null); }}
          />
        </div>

        <button style={s.btnPrimary} onClick={handleUploadFile} disabled={uploading || !uploadFile}>
          {uploading ? 'Uploading…' : 'Upload File'}
        </button>

        {uploadResult && (
          <div style={{ marginTop: '1rem' }}>
            {uploadResult.error && (
              <div style={s.alertError}>{uploadResult.error}</div>
            )}
            {uploadResult.document && (
              <div style={{ ...s.alertSuccess, marginBottom: uploadResult.import ? '0.5rem' : 0 }}>
                File uploaded: <strong>{uploadResult.document.file_name}</strong> ({formatFileSize(uploadResult.document.file_size)})
              </div>
            )}
            {uploadResult.import && (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '0.65rem 1rem', fontSize: '0.88rem' }}>
                <strong>CSV Import:</strong> {uploadResult.import.created} created, {uploadResult.import.updated} updated
                {uploadResult.import.errors?.length > 0 && (
                  <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.2rem', color: '#b91c1c' }}>
                    {uploadResult.import.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderAddTab = () => (
    <div>
      <p style={{ fontSize: '0.9rem', color: '#374151', marginBottom: '1rem' }}>
        Add a single subject to <strong>{curriculumProgram?.name}</strong>.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
        <div style={{ ...s.fieldGroup, gridColumn: '1 / -1' }}>
          <label style={s.label}>Subject Name *</label>
          <input style={s.input} placeholder="e.g. Introduction to Computing" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div style={s.fieldGroup}>
          <label style={s.label}>Subject Code *</label>
          <input style={s.input} placeholder="e.g. CC101" value={addForm.code} onChange={e => setAddForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} maxLength={20} />
        </div>
        <div style={s.fieldGroup}>
          <label style={s.label}>Units * (max 2 decimals)</label>
          <input style={s.input} type="number" min={0.5} max={12} step={0.01} placeholder="e.g. 3 or 1.25" value={addForm.units} onChange={e => setAddForm(f => ({ ...f, units: e.target.value }))} />
        </div>
        <div style={s.fieldGroup}>
          <label style={s.label}>Subject Type</label>
          <select style={s.input} value={addForm.subject_type} onChange={e => setAddForm(f => ({ ...f, subject_type: e.target.value }))}>
            {SUBJECT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div style={s.fieldGroup}>
          <label style={s.label}>Year Level</label>
          <select style={s.input} value={addForm.year_level} onChange={e => setAddForm(f => ({ ...f, year_level: e.target.value }))}>
            {YEAR_LEVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div style={s.fieldGroup}>
          <label style={s.label}>Semester</label>
          <select style={s.input} value={addForm.semester} onChange={e => setAddForm(f => ({ ...f, semester: e.target.value }))}>
            {SEMESTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div style={{ ...s.fieldGroup, gridColumn: '1 / -1' }}>
          <label style={s.label}>Prerequisite</label>
          <select style={s.input} value={addForm.prerequisite} onChange={e => setAddForm(f => ({ ...f, prerequisite: e.target.value }))}>
            <option value="">None</option>
            {curriculumPrerequisiteOptions().map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
          </select>
        </div>
        <div style={{ ...s.fieldGroup, gridColumn: '1 / -1' }}>
          <label style={s.label}>Description</label>
          <textarea style={{ ...s.input, height: 60, resize: 'vertical' }} placeholder="Optional" value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} />
        </div>
      </div>
      {addError && <p style={s.formError}>{addError}</p>}
      <div style={s.modalActions}>
        <button style={s.btnPrimary} onClick={handleAddSubject} disabled={addSaving}>
          {addSaving ? 'Saving…' : 'Add Subject'}
        </button>
      </div>
    </div>
  );

  // ── Search & pagination ───────────────────────────────────────────────────

  const PAGE_SIZE = 15;

  const deptSearchQ = deptSearch.trim().toLowerCase();
  const filteredDepts = deptSearchQ
    ? depts.filter(d => d.code.toLowerCase().includes(deptSearchQ) || d.name.toLowerCase().includes(deptSearchQ))
    : depts;
  const displayedDepts = filteredDepts.slice(0, PAGE_SIZE);

  const programSearchQ = programSearch.trim().toLowerCase();
  const filteredPrograms = programSearchQ
    ? programs.filter(p => p.code.toLowerCase().includes(programSearchQ) || p.name.toLowerCase().includes(programSearchQ) || (p.department_name || '').toLowerCase().includes(programSearchQ))
    : programs;
  const displayedPrograms = filteredPrograms.slice(0, PAGE_SIZE);

  const subjectSearchQ = subjectSearch.trim().toLowerCase();
  const filteredSubjects = subjectSearchQ
    ? subjects.filter(subj => subj.code.toLowerCase().includes(subjectSearchQ) || subj.name.toLowerCase().includes(subjectSearchQ) || (subj.program_code || '').toLowerCase().includes(subjectSearchQ))
    : subjects;
  const displayedSubjects = filteredSubjects.slice(0, PAGE_SIZE);

  // ── Render ────────────────────────────────────────────────────────────────

  const isRegistrar = user?.role === 'registrar';

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand"><img src="/logo.png" alt="NEMSU" className="sidebar-logo" />NEMSUonePortal</div>
        {isRegistrar ? (
          <>
            <Link className="sidebar-link" to="/registrar/dashboard">Dashboard</Link>
            <Link className="sidebar-link" to="/registrar/enrollment">Enrollment Requests</Link>
            <Link className="sidebar-link" to="/registrar/grades">List of Students</Link>
            <Link className="sidebar-link" to="/registrar/faculty">Faculty</Link>
            <Link className="sidebar-link" to="/registrar/schedule">Class Schedules</Link>
            <Link className="sidebar-link" to="/registrar/documents">Document Requests</Link>
            <Link className="sidebar-link active" to="/registrar/academic-data">Academic Data</Link>
            <Link className="sidebar-link" to="/registrar/announcements">Announcements</Link>
          </>
        ) : (
          <>
            <Link className="sidebar-link" to="/admin/dashboard">Dashboard</Link>
            <Link className="sidebar-link" to="/admin/users">User Management</Link>
            <Link className="sidebar-link active" to="/admin/programs">Programs &amp; Curriculum</Link>
            <Link className="sidebar-link" to="/admin/audit-log">Audit Log</Link>
            <Link className="sidebar-link" to="/admin/announcements">Announcements</Link>
            <Link className="sidebar-link" to="/admin/settings">System Settings</Link>
          </>
        )}
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Programs &amp; Curriculum</h1>
            <span className="badge">{user?.role}</span>
          </div>
          <button className="btn-logout" onClick={logout}>Sign Out</button>
        </div>

        {pageError && <div style={s.alertError}>{pageError}</div>}

        {/* ── DEPARTMENTS ──────────────────────────────────────────────────── */}
        <div style={s.section}>
          <SectionHeader title="Departments" count={depts.length} onAdd={openAddDept} />
          <div style={s.filterRow}>
            <input style={s.searchInput} placeholder="Search departments…" value={deptSearch} onChange={e => setDeptSearch(e.target.value)} />
          </div>
          {deptsLoading ? <p style={s.loading}>Loading…</p> : filteredDepts.length === 0 ? (
            <p style={s.empty}>{depts.length === 0 ? 'No departments yet.' : 'No departments match your search.'}</p>
          ) : (
            <>
              <table style={s.table}>
                <thead><tr>
                  <th style={s.th}>Code</th><th style={s.th}>Name</th>
                  <th style={s.th}>Programs</th><th style={s.th}>Status</th><th style={s.th}>Actions</th>
                </tr></thead>
                <tbody>
                  {displayedDepts.map(dept => (
                    <tr key={dept.id} style={s.tr}>
                      <td style={s.td}><code style={s.code}>{dept.code}</code></td>
                      <td style={s.td}>{dept.name}</td>
                      <td style={s.td}>{dept.program_count}</td>
                      <td style={s.td}><span style={dept.is_active ? s.badgeActive : s.badgeInactive}>{dept.is_active ? 'Active' : 'Inactive'}</span></td>
                      <td style={s.td}>
                        <button style={s.btnSm} onClick={() => openEditDept(dept)}>Edit</button>
                        <button style={{ ...s.btnSm, ...s.btnSmDanger }} disabled={deletingDept === dept.id} onClick={() => deleteDept(dept)}>{deletingDept === dept.id ? '…' : 'Delete'}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredDepts.length > PAGE_SIZE && (
                <p style={s.tableInfo}>Showing 15 of {filteredDepts.length} {deptSearchQ ? 'results' : 'departments'}</p>
              )}
            </>
          )}
        </div>

        {/* ── PROGRAMS ─────────────────────────────────────────────────────── */}
        <div style={s.section}>
          <SectionHeader title="Programs" count={programs.length} onAdd={openAddProgram} />
          <div style={s.filterRow}>
            <label style={s.filterLabel}>Filter by Department</label>
            <select value={programDeptFilter} onChange={e => { setProgramDeptFilter(e.target.value); fetchPrograms(e.target.value); }} style={s.filterSelect}>
              <option value="">All Departments</option>
              {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <input style={s.searchInput} placeholder="Search programs…" value={programSearch} onChange={e => setProgramSearch(e.target.value)} />
          </div>
          {programsLoading ? <p style={s.loading}>Loading…</p> : filteredPrograms.length === 0 ? (
            <p style={s.empty}>{programs.length === 0 ? `No programs${programDeptFilter ? ' in this department' : ''}.` : 'No programs match your search.'}</p>
          ) : (
            <>
              <table style={s.table}>
                <thead><tr>
                  <th style={s.th}>Code</th><th style={s.th}>Program Name</th><th style={s.th}>Department</th>
                  <th style={s.th}>Subjects</th><th style={s.th}>Status</th><th style={s.th}>Actions</th>
                </tr></thead>
                <tbody>
                  {displayedPrograms.map(prog => (
                    <tr key={prog.id} style={s.tr}>
                      <td style={s.td}><code style={s.code}>{prog.code}</code></td>
                      <td style={s.td}>{prog.name}</td>
                      <td style={s.td}>{prog.department_code} — {prog.department_name}</td>
                      <td style={s.td}>{prog.subject_count}</td>
                      <td style={s.td}><span style={prog.is_active ? s.badgeActive : s.badgeInactive}>{prog.is_active ? 'Active' : 'Inactive'}</span></td>
                      <td style={s.td}>
                        <button style={{ ...s.btnSm, ...s.btnCurriculum }} onClick={() => openCurriculum(prog)}>Curriculum</button>
                        <button style={s.btnSm} onClick={() => openEditProgram(prog)}>Edit</button>
                        <button style={{ ...s.btnSm, ...s.btnSmDanger }} disabled={deletingProgram === prog.id} onClick={() => deleteProgram(prog)}>{deletingProgram === prog.id ? '…' : 'Delete'}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredPrograms.length > PAGE_SIZE && (
                <p style={s.tableInfo}>Showing 15 of {filteredPrograms.length} {programSearchQ ? 'results' : 'programs'}</p>
              )}
            </>
          )}
        </div>

        {/* ── SUBJECTS ─────────────────────────────────────────────────────── */}
        <div style={s.section}>
          <SectionHeader title="All Subjects / Courses" count={subjects.length} onAdd={openAddSubject} />
          <div style={s.filterRow}>
            <label style={s.filterLabel}>Filter by Program</label>
            <select value={subjectProgramFilter} onChange={e => { setSubjectProgramFilter(e.target.value); fetchSubjects(e.target.value); }} style={s.filterSelect}>
              <option value="">All Programs</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </select>
            <input style={s.searchInput} placeholder="Search subjects…" value={subjectSearch} onChange={e => setSubjectSearch(e.target.value)} />
          </div>
          {subjectsLoading ? <p style={s.loading}>Loading…</p> : filteredSubjects.length === 0 ? (
            <p style={s.empty}>{subjects.length === 0 ? `No subjects${subjectProgramFilter ? ' in this program' : ''}.` : 'No subjects match your search.'}</p>
          ) : (
            <>
              <table style={s.table}>
                <thead><tr>
                  <th style={s.th}>Code</th><th style={s.th}>Subject Name</th>
                  <th style={s.th}>Units</th><th style={s.th}>Year</th><th style={s.th}>Semester</th>
                  <th style={s.th}>Program</th><th style={s.th}>Prerequisite</th><th style={s.th}>Status</th><th style={s.th}>Actions</th>
                </tr></thead>
                <tbody>
                  {displayedSubjects.map(subj => (
                    <tr key={subj.id} style={s.tr}>
                      <td style={s.td}><code style={s.code}>{subj.code}</code></td>
                      <td style={s.td}>
                        {subj.name}
                        <div style={s.mutedSmall}>{subj.subject_type_display || SUBJECT_TYPE_LABELS[subj.subject_type] || 'Minor Subject'}</div>
                      </td>
                      <td style={{ ...s.td, textAlign: 'center' }}>{formatUnits(subj.units)}</td>
                      <td style={s.td}>{subj.year_level ? YEAR_LABELS[subj.year_level] : '—'}</td>
                      <td style={s.td}>{subj.semester ? SEM_LABELS[subj.semester] : '—'}</td>
                      <td style={s.td}>{subj.program_code ? <code style={s.code}>{subj.program_code}</code> : <span style={{ color: '#9ca3af' }}>—</span>}</td>
                      <td style={s.td}>{prerequisiteLabel(subj)}</td>
                      <td style={s.td}><span style={subj.is_active ? s.badgeActive : s.badgeInactive}>{subj.is_active ? 'Active' : 'Inactive'}</span></td>
                      <td style={s.td}>
                        <button style={s.btnSm} onClick={() => openEditSubject(subj)}>Edit</button>
                        <button style={{ ...s.btnSm, ...s.btnSmDanger }} disabled={deletingSubject === subj.id} onClick={() => deleteSubject(subj)}>{deletingSubject === subj.id ? '…' : 'Delete'}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredSubjects.length > PAGE_SIZE && (
                <p style={s.tableInfo}>Showing 15 of {filteredSubjects.length} {subjectSearchQ ? 'results' : 'subjects'}</p>
              )}
            </>
          )}
        </div>

        {/* ── LANDING PAGE SETTINGS ────────────────────────────────────────── */}
        <div style={s.section}>
          <div style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: 0 }}>Landing Page Settings</h2>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>Control the enrollment status, academic year, and schedule shown on the public landing page.</p>
          </div>
          <EnrollmentScheduleManager />
        </div>
      </main>

      {/* ══ CURRICULUM MODAL ════════════════════════════════════════════════ */}
      {curriculumProgram && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, maxWidth: 900, width: '95vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
            <div style={s.modalHeader}>
              <div>
                <h2 style={s.modalTitle}>Curriculum — {curriculumProgram.code}</h2>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#6b7280' }}>{curriculumProgram.name}</p>
              </div>
              <button style={s.modalClose} onClick={closeCurriculum}>×</button>
            </div>

            <div style={s.tabs}>
              {[
                { key: 'view', label: `Subjects (${curriculumSubjects.length})` },
                { key: 'upload', label: 'Upload File' },
                { key: 'add', label: 'Add Manually' },
              ].map(t => (
                <button
                  key={t.key}
                  style={{ ...s.tab, ...(curriculumTab === t.key ? s.tabActive : {}) }}
                  onClick={() => { setCurriculumTab(t.key); setEditingCurrSubject(null); }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingTop: '1rem' }}>
              {curriculumTab === 'view' && renderCurriculumView()}
              {curriculumTab === 'upload' && renderUploadTab()}
              {curriculumTab === 'add' && renderAddTab()}
            </div>
          </div>
        </div>
      )}

      {/* ── DEPARTMENT MODAL ─────────────────────────────────────────────── */}
      {deptModal && (
        <Modal title={deptModal === 'add' ? 'Add Department' : 'Edit Department'} onClose={() => setDeptModal(null)}>
          <div style={s.fieldGroup}><label style={s.label}>Department Name *</label><input style={s.input} placeholder="e.g. Department of Computer Studies" value={deptForm.name} onChange={e => setDeptForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div style={s.fieldGroup}><label style={s.label}>Code *</label><input style={s.input} placeholder="e.g. DCS" value={deptForm.code} onChange={e => setDeptForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} maxLength={20} /></div>
          <div style={s.fieldGroup}><label style={s.label}>Description</label><textarea style={{ ...s.input, height: 72, resize: 'vertical' }} placeholder="Optional" value={deptForm.description} onChange={e => setDeptForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div style={s.fieldGroup}><label style={s.checkLabel}><input type="checkbox" checked={deptForm.is_active} onChange={e => setDeptForm(f => ({ ...f, is_active: e.target.checked }))} style={{ marginRight: '0.4rem' }} />Active</label></div>
          {deptError && <p style={s.formError}>{deptError}</p>}
          <div style={s.modalActions}>
            <button style={s.btnSecondary} onClick={() => setDeptModal(null)} disabled={deptSaving}>Cancel</button>
            <button style={s.btnPrimary} onClick={saveDept} disabled={deptSaving}>{deptSaving ? 'Saving…' : 'Save Department'}</button>
          </div>
        </Modal>
      )}

      {/* ── PROGRAM MODAL ────────────────────────────────────────────────── */}
      {programModal && (
        <Modal title={programModal === 'add' ? 'Add Program' : 'Edit Program'} onClose={() => setProgramModal(null)}>
          <div style={s.fieldGroup}><label style={s.label}>Program Name *</label><input style={s.input} placeholder="e.g. Bachelor of Science in Information Technology" value={programForm.name} onChange={e => setProgramForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div style={s.fieldGroup}><label style={s.label}>Code *</label><input style={s.input} placeholder="e.g. BSIT" value={programForm.code} onChange={e => setProgramForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} maxLength={20} /></div>
          <div style={s.fieldGroup}><label style={s.label}>Department *</label>
            <select style={s.input} value={programForm.department} onChange={e => setProgramForm(f => ({ ...f, department: e.target.value }))}>
              <option value="">— Select Department —</option>
              {depts.map(d => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
            </select>
          </div>
          <div style={s.fieldGroup}><label style={s.label}>Description</label><textarea style={{ ...s.input, height: 72, resize: 'vertical' }} placeholder="Optional" value={programForm.description} onChange={e => setProgramForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div style={s.fieldGroup}><label style={s.checkLabel}><input type="checkbox" checked={programForm.is_active} onChange={e => setProgramForm(f => ({ ...f, is_active: e.target.checked }))} style={{ marginRight: '0.4rem' }} />Active</label></div>
          {programError && <p style={s.formError}>{programError}</p>}
          <div style={s.modalActions}>
            <button style={s.btnSecondary} onClick={() => setProgramModal(null)} disabled={programSaving}>Cancel</button>
            <button style={s.btnPrimary} onClick={saveProgram} disabled={programSaving}>{programSaving ? 'Saving…' : 'Save Program'}</button>
          </div>
        </Modal>
      )}

      {/* ── SUBJECT MODAL ────────────────────────────────────────────────── */}
      {subjectModal && (
        <Modal title={subjectModal === 'add' ? 'Add Subject / Course' : 'Edit Subject / Course'} onClose={() => setSubjectModal(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <div style={{ ...s.fieldGroup, gridColumn: '1 / -1' }}><label style={s.label}>Subject Name *</label><input style={s.input} placeholder="e.g. Introduction to Computing" value={subjectForm.name} onChange={e => setSubjectForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div style={s.fieldGroup}><label style={s.label}>Subject Code *</label><input style={s.input} placeholder="e.g. CC101" value={subjectForm.code} onChange={e => setSubjectForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} maxLength={20} /></div>
            <div style={s.fieldGroup}><label style={s.label}>Units * (max 2 decimals)</label><input style={s.input} type="number" min={0.5} max={12} step={0.01} placeholder="e.g. 3 or 1.25" value={subjectForm.units} onChange={e => setSubjectForm(f => ({ ...f, units: e.target.value }))} /></div>
            <div style={s.fieldGroup}><label style={s.label}>Subject Type</label>
              <select style={s.input} value={subjectForm.subject_type} onChange={e => setSubjectForm(f => ({ ...f, subject_type: e.target.value }))}>
                {SUBJECT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div style={s.fieldGroup}><label style={s.label}>Program</label>
              <SearchableSelect
                value={subjectForm.program}
                options={programSelectOptions}
                placeholder="Search or select a program"
                onChange={program => setSubjectForm(f => ({ ...f, program, prerequisite: '' }))}
              />
              <select style={{ display: 'none' }} value={subjectForm.program} onChange={e => setSubjectForm(f => ({ ...f, program: e.target.value, prerequisite: '' }))}>
                <option value="">— None —</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
              </select>
            </div>
            <div style={s.fieldGroup}><label style={s.label}>Year Level</label>
              <select style={s.input} value={subjectForm.year_level} onChange={e => setSubjectForm(f => ({ ...f, year_level: e.target.value }))}>
                {YEAR_LEVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div style={s.fieldGroup}><label style={s.label}>Semester</label>
              <select style={s.input} value={subjectForm.semester} onChange={e => setSubjectForm(f => ({ ...f, semester: e.target.value }))}>
                {SEMESTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div style={{ ...s.fieldGroup, gridColumn: '1 / -1' }}><label style={s.label}>Prerequisite</label>
              <SearchableSelect
                value={subjectForm.prerequisite}
                options={prerequisiteSelectOptions}
                placeholder="Search or select a prerequisite"
                onChange={prerequisite => setSubjectForm(f => ({ ...f, prerequisite }))}
              />
              <select style={{ display: 'none' }} value={subjectForm.prerequisite} onChange={e => setSubjectForm(f => ({ ...f, prerequisite: e.target.value }))}>
                <option value="">None</option>
                {subjectPrerequisiteOptions(subjectForm.program, subjectModal?.id).map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
              </select>
            </div>
            <div style={{ ...s.fieldGroup, gridColumn: '1 / -1' }}><label style={s.label}>Description</label><textarea style={{ ...s.input, height: 60, resize: 'vertical' }} placeholder="Optional" value={subjectForm.description} onChange={e => setSubjectForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div style={{ ...s.fieldGroup, gridColumn: '1 / -1' }}><label style={s.checkLabel}><input type="checkbox" checked={subjectForm.is_active} onChange={e => setSubjectForm(f => ({ ...f, is_active: e.target.checked }))} style={{ marginRight: '0.4rem' }} />Active</label></div>
          </div>
          {subjectError && <p style={s.formError}>{subjectError}</p>}
          <div style={s.modalActions}>
            <button style={s.btnSecondary} onClick={() => setSubjectModal(null)} disabled={subjectSaving}>Cancel</button>
            <button style={s.btnPrimary} onClick={saveSubject} disabled={subjectSaving}>{subjectSaving ? 'Saving…' : 'Save Subject'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  alertError: { background: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.9rem' },
  alertSuccess: { background: '#d1fae5', color: '#065f46', padding: '0.65rem 1rem', borderRadius: 6, fontSize: '0.9rem' },
  section: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '1.25rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  sectionTitle: { fontWeight: 700, fontSize: '1rem', color: '#1e3a5f' },
  sectionCount: { background: '#e0e7ff', color: '#3730a3', borderRadius: 20, padding: '0.1rem 0.55rem', fontSize: '0.78rem', fontWeight: 700, marginLeft: '0.6rem' },
  filterRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' },
  filterLabel: { fontSize: '0.85rem', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' },
  filterSelect: { padding: '0.4rem 0.65rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.88rem', minWidth: 200 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' },
  th: { textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 700, color: '#374151', borderBottom: '2px solid #e5e7eb', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' },
  tr: { borderBottom: '1px solid #f3f4f6' },
  td: { padding: '0.55rem 0.75rem', color: '#374151', verticalAlign: 'middle' },
  code: { background: '#f3f4f6', borderRadius: 4, padding: '0.1rem 0.4rem', fontFamily: 'monospace', fontSize: '0.85rem', color: '#1e3a5f', fontWeight: 700 },
  badgeActive: { background: '#d1fae5', color: '#065f46', borderRadius: 20, padding: '0.15rem 0.55rem', fontSize: '0.75rem', fontWeight: 700 },
  badgeInactive: { background: '#fee2e2', color: '#991b1b', borderRadius: 20, padding: '0.15rem 0.55rem', fontSize: '0.75rem', fontWeight: 700 },
  loading: { color: '#9ca3af', fontSize: '0.88rem', padding: '0.5rem 0' },
  empty: { color: '#9ca3af', fontSize: '0.88rem', fontStyle: 'italic', padding: '0.5rem 0' },
  mutedSmall: { color: '#6b7280', fontSize: '0.75rem', marginTop: '0.15rem' },
  btnPrimary: { background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.1rem', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600 },
  btnSecondary: { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, padding: '0.5rem 1rem', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600 },
  btnSm: { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 5, padding: '0.2rem 0.65rem', fontSize: '0.8rem', cursor: 'pointer', marginRight: '0.35rem' },
  btnSmDanger: { background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' },
  btnSmEdit: { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' },
  btnSmPrimary: { background: '#1e3a5f', color: '#fff', border: 'none' },
  btnCurriculum: { background: '#ede9fe', color: '#5b21b6', border: '1px solid #c4b5fd' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: 12, padding: '1.75rem 2rem', width: '100%', maxWidth: 520, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' },
  modalTitle: { margin: 0, fontSize: '1.1rem', color: '#1e3a5f', fontWeight: 700 },
  modalClose: { background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#6b7280', lineHeight: 1 },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' },
  tabs: { display: 'flex', gap: '0.25rem', borderBottom: '2px solid #e5e7eb', marginBottom: '0' },
  tab: { background: 'none', border: 'none', borderBottom: '2px solid transparent', padding: '0.55rem 1rem', fontSize: '0.9rem', cursor: 'pointer', color: '#6b7280', fontWeight: 600, marginBottom: '-2px' },
  tabActive: { borderBottomColor: '#1e3a5f', color: '#1e3a5f' },
  fieldGroup: { marginBottom: '1rem' },
  label: { display: 'block', fontWeight: 600, fontSize: '0.88rem', color: '#374151', marginBottom: '0.35rem' },
  checkLabel: { fontWeight: 600, fontSize: '0.88rem', color: '#374151', display: 'flex', alignItems: 'center' },
  input: { width: '100%', padding: '0.5rem 0.75rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.92rem', boxSizing: 'border-box' },
  combo: { position: 'relative', width: '100%' },
  comboButton: { position: 'absolute', right: 1, top: 1, bottom: 1, width: 34, border: 'none', borderLeft: '1px solid #e5e7eb', borderRadius: '0 6px 6px 0', background: '#fff', color: '#111827', cursor: 'pointer', fontSize: '0.75rem' },
  comboMenu: { position: 'absolute', zIndex: 1200, top: 'calc(100% + 4px)', left: 0, right: 0, maxHeight: 180, overflowY: 'auto', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, boxShadow: '0 8px 20px rgba(15, 23, 42, 0.16)', padding: '0.25rem 0' },
  comboOption: { display: 'block', width: '100%', border: 'none', background: '#fff', color: '#374151', textAlign: 'left', padding: '0.45rem 0.75rem', fontSize: '0.88rem', cursor: 'pointer' },
  comboOptionActive: { background: '#e0e7ff', color: '#1e3a5f', fontWeight: 700 },
  comboEmpty: { padding: '0.5rem 0.75rem', color: '#9ca3af', fontSize: '0.85rem' },
  inlineLabel: { display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.2rem' },
  inlineInput: { width: '100%', padding: '0.3rem 0.5rem', borderRadius: 5, border: '1px solid #d1d5db', fontSize: '0.85rem', boxSizing: 'border-box' },
  formError: { color: '#b91c1c', fontSize: '0.85rem', marginTop: '0.25rem' },
  searchInput: { padding: '0.4rem 0.65rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.88rem', minWidth: 200, flex: 1 },
  tableInfo: { fontSize: '0.8rem', color: '#6b7280', marginTop: '0.5rem', textAlign: 'right' },
  currYearBlock: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.85rem 1rem' },
  currYearLabel: { fontWeight: 700, fontSize: '0.95rem', color: '#1e3a5f', marginBottom: '0.25rem' },
  currSemLabel: { fontSize: '0.82rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem', marginTop: '0.75rem' },
};
