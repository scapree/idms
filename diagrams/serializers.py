from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import Project, Diagram


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
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


class ProjectSerializer(serializers.ModelSerializer):
    owner = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Project
        fields = '__all__'


class DiagramSerializer(serializers.ModelSerializer):
    locked_by = serializers.CharField(source='locked_by.username', read_only=True)
    data = serializers.JSONField(required=False)

    class Meta:
        model = Diagram
        fields = [
            'id',
            'name',
            'type',
            'data',
            'is_locked',
            'locked_by',
            'project',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'is_locked', 'locked_by', 'data', 'created_at', 'updated_at']