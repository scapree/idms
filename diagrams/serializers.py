from rest_framework import serializers
from models import Project


class ProjectSerializer(serializers.ModelSerializer):
    owner = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Project
        fields = '__all__'