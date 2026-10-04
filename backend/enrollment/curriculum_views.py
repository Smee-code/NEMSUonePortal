"""
Curriculum management endpoints for the Registrar and Admin (all programs).
"""
import logging

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.models import AuditLog
from authentication.permissions import IsRegistrarOrAdmin, IsStudent, get_client_ip

from .models import Curriculum, Program, Subject
from .serializers import (
    CurriculumAddSubjectSerializer,
    CurriculumCreateSerializer,
    CurriculumDetailSerializer,
    CurriculumListSerializer,
    CurriculumSubjectSerializer,
    ProgramSerializer,
)

logger = logging.getLogger('security')


def _audit(user, role, action, resource, ip, result='success', extra=None):
    try:
        AuditLog.objects.create(
            user=user, role=role or '', action=action, resource=resource,
            ip_address=ip, result=result, extra=extra or {},
        )
    except Exception:
        logger.error('Audit log write failed', exc_info=True)


def _scope_ok(user, program):
    """Registrar and admin manage curricula across all programs."""
    return user.role in ('registrar', 'admin')


def _batch_year(student_id):
    """Entry batch year from a student ID like '2024-0008' -> 2024."""
    import re
    m = re.match(r'\s*(\d{4})', student_id or '')
    return int(m.group(1)) if m else None


def assign_curriculum_for_student(user):
    """
    Auto-assign the curriculum a student follows, by their entry batch: the latest
    curriculum of their program whose effectivity year is <= their batch year;
    otherwise the program's earliest curriculum. No-op if the student has no program
    or already has a curriculum. Returns the assigned Curriculum or None.
    """
    if user.role != 'student' or user.program_id is None or user.curriculum_id is not None:
        return user.curriculum if user.curriculum_id else None
    year = _batch_year(user.student_id)
    qs = Curriculum.objects.filter(program_id=user.program_id, is_active=True)
    chosen = None
    if year is not None:
        chosen = qs.filter(year_effective__lte=year).order_by('-year_effective').first()
    if chosen is None:
        chosen = qs.order_by('year_effective').first()
    if chosen is not None:
        user.curriculum = chosen
        user.save(update_fields=['curriculum'])
    return chosen


class CurriculumProgramListView(generics.ListAPIView):
    """GET /api/enrollment/curriculum/programs/ — programs available for curriculum management."""
    serializer_class = ProgramSerializer
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]

    def get_queryset(self):
        qs = Program.objects.select_related('department').filter(is_active=True)
        return qs.order_by('code')


class CurriculumListCreateView(APIView):
    """GET (list, ?program=<id>) + POST (create) curricula."""
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]

    def get(self, request):
        qs = Curriculum.objects.select_related('program', 'program__department')
        program_id = request.query_params.get('program')
        if program_id and program_id.isdigit():
            qs = qs.filter(program_id=int(program_id))
        return Response(CurriculumListSerializer(qs, many=True).data)

    def post(self, request):
        ip = get_client_ip(request)
        serializer = CurriculumCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        program = data['program']
        if not _scope_ok(request.user, program):
            return Response({'error': 'This program is not in your department.'},
                            status=status.HTTP_403_FORBIDDEN)

        curriculum = Curriculum.objects.create(
            program=program, code=data['code'], year_effective=data['year_effective'],
            created_by=request.user,
        )
        dup = data.get('duplicate_from')
        if dup:
            curriculum.subjects.add(*dup.subjects.all())

        _audit(request.user, request.user.role, 'curriculum_created',
               f'curriculum:{curriculum.id}', ip, 'success',
               {'program': program.code, 'code': curriculum.code,
                'duplicated_from': dup.code if dup else None})
        return Response(CurriculumDetailSerializer(curriculum).data, status=status.HTTP_201_CREATED)


class CurriculumDetailView(APIView):
    """GET / DELETE a single curriculum (with its courses)."""
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]

    def _get(self, request, pk):
        curriculum = Curriculum.objects.select_related('program', 'program__department').get(pk=pk)
        if not _scope_ok(request.user, curriculum.program):
            return None
        return curriculum

    def get(self, request, pk):
        try:
            curriculum = self._get(request, pk)
        except Curriculum.DoesNotExist:
            return Response({'error': 'Curriculum not found.'}, status=status.HTTP_404_NOT_FOUND)
        if curriculum is None:
            return Response({'error': 'Not in your department.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(CurriculumDetailSerializer(curriculum).data)

    def delete(self, request, pk):
        try:
            curriculum = self._get(request, pk)
        except Curriculum.DoesNotExist:
            return Response({'error': 'Curriculum not found.'}, status=status.HTTP_404_NOT_FOUND)
        if curriculum is None:
            return Response({'error': 'Not in your department.'}, status=status.HTTP_403_FORBIDDEN)
        if curriculum.students.exists():
            return Response({'error': 'Cannot delete a curriculum that has students assigned to it.'},
                            status=status.HTTP_409_CONFLICT)
        code = curriculum.code
        curriculum.delete()
        _audit(request.user, request.user.role, 'curriculum_deleted', f'curriculum:{pk}',
               get_client_ip(request), 'success', {'code': code})
        return Response(status=status.HTTP_204_NO_CONTENT)


class CurriculumSubjectView(APIView):
    """POST add a course / DELETE remove a course from a curriculum."""
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]

    def _get_curriculum(self, request, pk):
        curriculum = Curriculum.objects.select_related('program').get(pk=pk)
        if not _scope_ok(request.user, curriculum.program):
            return None
        return curriculum

    def post(self, request, pk):
        ip = get_client_ip(request)
        try:
            curriculum = self._get_curriculum(request, pk)
        except Curriculum.DoesNotExist:
            return Response({'error': 'Curriculum not found.'}, status=status.HTTP_404_NOT_FOUND)
        if curriculum is None:
            return Response({'error': 'Not in your department.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = CurriculumAddSubjectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data
        code = d['code']

        existing = Subject.objects.filter(code__iexact=code).first()
        if existing:
            # Shared/identical only if placement matches; otherwise a different course.
            if existing.year_level != d['year_level'] or existing.semester != d['semester']:
                return Response(
                    {'error': f"Course {code} already exists at "
                              f"{existing.get_year_level_display()} / {existing.get_semester_display()}. "
                              f"A course at a different year or semester is a different course - use a different code."},
                    status=status.HTTP_409_CONFLICT,
                )
            subject = existing
        else:
            if not d.get('name') or d.get('units') is None:
                return Response({'error': 'New course needs a name and units.'},
                                status=status.HTTP_400_BAD_REQUEST)
            prereq = None
            pcode = (d.get('prerequisite_code') or '').strip().upper()
            if pcode:
                prereq = Subject.objects.filter(code__iexact=pcode).first()
                if not prereq:
                    return Response({'error': f"Prerequisite {pcode} not found. Add it first."},
                                    status=status.HTTP_400_BAD_REQUEST)
            subject = Subject.objects.create(
                code=code, name=d['name'], units=d['units'],
                subject_type=d.get('subject_type', 'minor'),
                year_level=d['year_level'], semester=d['semester'],
                program=curriculum.program, prerequisite=prereq,
            )

        if curriculum.subjects.filter(pk=subject.pk).exists():
            return Response({'error': f'{code} is already in this curriculum.'},
                            status=status.HTTP_409_CONFLICT)
        curriculum.subjects.add(subject)
        _audit(request.user, request.user.role, 'curriculum_subject_added',
               f'curriculum:{curriculum.id}', ip, 'success',
               {'code': code, 'reused': bool(existing)})
        return Response(CurriculumSubjectSerializer(subject).data, status=status.HTTP_201_CREATED)

    def delete(self, request, pk, subject_id):
        try:
            curriculum = self._get_curriculum(request, pk)
        except Curriculum.DoesNotExist:
            return Response({'error': 'Curriculum not found.'}, status=status.HTTP_404_NOT_FOUND)
        if curriculum is None:
            return Response({'error': 'Not in your department.'}, status=status.HTTP_403_FORBIDDEN)
        curriculum.subjects.remove(subject_id)  # removes the link only, keeps the shared course
        _audit(request.user, request.user.role, 'curriculum_subject_removed',
               f'curriculum:{curriculum.id}', get_client_ip(request), 'success',
               {'subject_id': subject_id})
        return Response(status=status.HTTP_204_NO_CONTENT)


class StudentCurriculumView(APIView):
    """GET /api/enrollment/my-curriculum/ — the requesting student's course map."""
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        user = request.user

        curriculum = None
        if user.curriculum_id:
            curriculum = Curriculum.objects.select_related('program').filter(pk=user.curriculum_id).first()

        # Fall back to the program's current curriculum when the student has no
        # curriculum explicitly assigned — the program alone already identifies it
        # (for programs with a single curriculum, unambiguously).
        if curriculum is None and user.program_id:
            curriculum = (
                Curriculum.objects.select_related('program')
                .filter(program_id=user.program_id, is_active=True)
                .order_by('-year_effective')
                .first()
            )

        if curriculum is None:
            return Response({'curriculum': None, 'subjects': []})
        return Response(CurriculumDetailSerializer(curriculum).data)
