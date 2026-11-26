import os

from django.utils import timezone
from rest_framework import serializers

from .models import Announcement, Notification

# Poster / infographic uploads. SVG and GIF are deliberately not accepted: an SVG
# can carry scripts, and the cards are for still images.
ALLOWED_IMAGE_EXT = {'.jpg', '.jpeg', '.png', '.webp'}
MAX_IMAGE_BYTES = 5 * 1024 * 1024


def _looks_like_image(head):
    """True when the first bytes are a JPEG, PNG or WEBP signature. The file
    name and the browser's content type can both lie; the bytes cannot."""
    return (
        head.startswith(b'\xff\xd8\xff')                      # JPEG
        or head.startswith(b'\x89PNG\r\n\x1a\n')              # PNG
        or (head[:4] == b'RIFF' and head[8:12] == b'WEBP')    # WEBP
    )


class AnnouncementSerializer(serializers.ModelSerializer):
    posted_by_name = serializers.CharField(source='posted_by.full_name', read_only=True)
    posted_by_role = serializers.CharField(source='posted_by.role', read_only=True)
    target_display = serializers.CharField(source='get_target_audience_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    is_new = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()
    # Read: the image's absolute URL (or null). Write: an uploaded file.
    image = serializers.FileField(required=False, allow_null=True, use_url=True)
    # Write-only: send true to take the image off an existing announcement.
    remove_image = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = Announcement
        fields = [
            'id', 'title', 'body',
            'target_audience', 'target_display',
            'category', 'category_display',
            'image', 'remove_image',
            'event_date', 'event_time', 'location',
            'is_pinned', 'is_active',
            'posted_by_name', 'posted_by_role',
            'created_at', 'updated_at',
            'is_new', 'is_mine',
        ]
        read_only_fields = [
            'id', 'posted_by_name', 'posted_by_role', 'is_active',
            'created_at', 'updated_at', 'target_display', 'category_display',
            'is_new', 'is_mine',
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

    def validate_location(self, value):
        return value.strip()

    def validate_image(self, value):
        if value is None:
            return value
        ext = os.path.splitext(value.name)[1].lower()
        if ext not in ALLOWED_IMAGE_EXT:
            raise serializers.ValidationError('Only JPG, PNG, or WEBP images are allowed.')
        if value.size > MAX_IMAGE_BYTES:
            raise serializers.ValidationError('Image is too large (max 5 MB).')
        head = value.read(12)
        value.seek(0)
        if not _looks_like_image(head):
            raise serializers.ValidationError('That file is not a valid JPG, PNG, or WEBP image.')
        return value

    def validate(self, attrs):
        # A time only means something with a date to attach it to.
        date = attrs.get('event_date', getattr(self.instance, 'event_date', None))
        time = attrs.get('event_time', getattr(self.instance, 'event_time', None))
        if time and not date:
            raise serializers.ValidationError({'event_time': 'Set a date as well, or clear the time.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('remove_image', None)
        if validated_data.get('image') is None:
            validated_data.pop('image', None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        remove = validated_data.pop('remove_image', False)
        new_image = validated_data.pop('image', None)
        old = instance.image if instance.image else None
        if new_image is not None:
            validated_data['image'] = new_image
        elif remove:
            validated_data['image'] = ''
        instance = super().update(instance, validated_data)
        # The old file is no longer referenced: do not leave it on disk.
        if old and (new_image is not None or remove):
            old.storage.delete(old.name)
        return instance


class NotificationSerializer(serializers.ModelSerializer):
    """Shaped to match the topbar bell, which renders announcements and personal
    notifications from one list (id, title, body, target_display, created_at)."""
    target_display = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ['id', 'title', 'body', 'category', 'target_display', 'link', 'created_at', 'read_at']

    def get_target_display(self, obj):
        return Notification.CATEGORY_LABELS.get(
            obj.category, obj.category.capitalize() if obj.category else '',
        )
