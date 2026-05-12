from django.utils import timezone
from rest_framework import serializers

from .models import Announcement


class AnnouncementSerializer(serializers.ModelSerializer):
    posted_by_name = serializers.CharField(source='posted_by.full_name', read_only=True)
    posted_by_role = serializers.CharField(source='posted_by.role', read_only=True)
    target_display = serializers.CharField(source='get_target_audience_display', read_only=True)
    is_new = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = [
            'id', 'title', 'body',
            'target_audience', 'target_display',
            'is_pinned', 'is_active',
            'posted_by_name', 'posted_by_role',
            'created_at', 'updated_at',
            'is_new', 'is_mine',
        ]
        read_only_fields = [
            'id', 'posted_by_name', 'posted_by_role', 'is_active',
            'created_at', 'updated_at', 'target_display', 'is_new', 'is_mine',
        ]

    def get_is_new(self, obj):
        return (timezone.now() - obj.created_at).days < 7

    def get_is_mine(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.posted_by_id == request.user.id

    def validate_title(self, value):
        stripped = value.strip()
        if not stripped:
            raise serializers.ValidationError('Title cannot be blank.')
        return stripped

    def validate_body(self, value):
        stripped = value.strip()
        if not stripped:
            raise serializers.ValidationError('Body cannot be blank.')
        return stripped
