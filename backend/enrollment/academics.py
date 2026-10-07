"""Academic progression helpers used by enrollment.

- has_passed: did the student finish a course with a passing grade?
- offered_subjects: the curriculum courses for a program at a year level + semester.
- eligible_offered: those offered courses annotated with prerequisite eligibility.

Passing rule (registrar-confirmed): a course counts as passed only when there is
a finalized grade at or above the passing mark. A failing grade, INC, DRP, or no
record at all all count as "not passed", which blocks any course that requires it.
"""
from decimal import Decimal, InvalidOperation

# PH scale: 1.00 (highest) … 3.00 (lowest passing); anything above 3.00 fails.
PASSING_MARK = Decimal('3.00')


def has_passed(student, subject):
    """True only if the student finished `subject` with a passing OVERALL grade.

    Pass/fail is decided by the overall course grade (GradeRecord.grade, the
    average of midterm and final) — NOT the final-exam component (final_grade)
    alone. A student can score <= 3.00 on the final yet still FAIL the course
    overall, so using final_grade would wrongly clear the prerequisite.
    INC / DRP / no record / a blank or failing overall grade all count as
    "not passed", which blocks any course that requires it.
    """
    if subject is None:
        return True
    from grades.models import GradeRecord
    rec = (
        GradeRecord.objects
        .filter(student=student, subject=subject)
        .order_by('-academic_term__year', '-academic_term__semester')
        .first()
    )
    if not rec or rec.is_dropped:
        return False
    # `grade` is a numeric string ("1.75", "4.00") once midterm + final are in;
    # "INC", "DRP" or "" are non-numeric and mean the course isn't passed.
    try:
        overall = Decimal(rec.grade)
    except (InvalidOperation, TypeError):
        return False
    return overall <= PASSING_MARK


def offered_subjects(program, year_level, semester):
    """Active curriculum subjects for a program at a given year level + semester."""
    from .models import Subject
    if not (program and year_level and semester):
        from .models import Subject as _S
        return _S.objects.none()
    return (
        Subject.objects
        .filter(program=program, year_level=year_level, semester=semester, is_active=True)
        .select_related('prerequisite')
        .order_by('code')
    )


def eligible_offered(student, program, year_level, semester):
    """Offered subjects annotated with prerequisite eligibility.

    Returns a list of dicts: {subject, eligible, prereq, blocked_reason}.
    A course is not eligible when its prerequisite has not been passed.
    """
    rows = []
    for subj in offered_subjects(program, year_level, semester):
        prereq = subj.prerequisite
        ok = has_passed(student, prereq) if prereq else True
        rows.append({
            'subject': subj,
            'eligible': ok,
            'prereq': prereq,
            'blocked_reason': '' if ok else (f'Requires passing {prereq.code}' if prereq else ''),
        })
    return rows
