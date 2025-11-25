from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import Project, Diagram, ProjectInvite, ProjectMembership


User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Passwords don't match"})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']


class ProjectSerializer(serializers.ModelSerializer):
    owner = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Project
        fields = [
            'id',
            'name',
            'description',
            'user',
            'owner',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user', 'owner', 'created_at', 'updated_at']


class DiagramSerializer(serializers.ModelSerializer):
    locked_by = UserSerializer(read_only=True)

    class Meta:
        model = Diagram
        fields = [
            'id',
            'name',
            'diagram_type',
            'data',
            'is_locked',
            'locked_by',
            'project',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'is_locked',
            'locked_by',
            'project',
            'created_at',
            'updated_at',
        ]


class ProjectInviteSerializer(serializers.ModelSerializer):
    invited_by = serializers.CharField(source='invited_by.username', read_only=True)
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = ProjectInvite
        fields = [
            'id',
            'project',
            'token',
            'invited_by',
            'expires_at',
            'is_active',
            'is_expired',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'project',
            'token',
            'invited_by',
            'created_at',
        ]

    def get_is_expired(self, obj):
        return obj.is_expired


class ProjectInviteInfoSerializer(serializers.Serializer):
    project_id = serializers.IntegerField()
    project_name = serializers.CharField()
    project_description = serializers.CharField(allow_null=True, allow_blank=True)
    owner_username = serializers.CharField()
    is_valid = serializers.BooleanField()
    is_expired = serializers.BooleanField()
    expires_at = serializers.DateTimeField()


class ProjectMembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = ProjectMembership
        fields = ['id', 'project', 'user', 'role', 'created_at']
        read_only_fields = ['id', 'project', 'user', 'role', 'created_at']