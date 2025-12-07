from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import Project, Diagram, ProjectInvite, ProjectMembership, DiagramLink


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
    # Explicitly define data field to ensure DRF handles the JSON payload correctly
    data = serializers.JSONField(binary=False, default=dict)

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


class DiagramLinkSerializer(serializers.ModelSerializer):
    source_diagram_name = serializers.CharField(source='source_diagram.name', read_only=True)
    source_diagram_type = serializers.CharField(source='source_diagram.diagram_type', read_only=True)
    target_diagram_name = serializers.CharField(source='target_diagram.name', read_only=True)
    target_diagram_type = serializers.CharField(source='target_diagram.diagram_type', read_only=True)
    target_diagram_project = serializers.IntegerField(source='target_diagram.project_id', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = DiagramLink
        fields = [
            'id',
            'source_diagram',
            'source_diagram_name',
            'source_diagram_type',
            'source_element_id',
            'source_element_label',
            'target_diagram',
            'target_diagram_name',
            'target_diagram_type',
            'target_diagram_project',
            'target_element_id',
            'link_type',
            'description',
            'created_at',
            'created_by',
            'created_by_username',
        ]
        read_only_fields = [
            'id',
            'source_diagram_name',
            'source_diagram_type',
            'target_diagram_name',
            'target_diagram_type',
            'target_diagram_project',
            'created_at',
            'created_by',
            'created_by_username',
        ]


class DiagramLinkCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiagramLink
        fields = [
            'source_element_id',
            'source_element_label',
            'target_diagram',
            'target_element_id',
            'link_type',
            'description',
        ]

    def validate(self, attrs):
        source_diagram = self.context.get('source_diagram')
        target_diagram = attrs.get('target_diagram')
        link_type = attrs.get('link_type', 'reference')
        
        # Cannot link to self
        if target_diagram == source_diagram:
            raise serializers.ValidationError({"target_diagram": "Нельзя связать диаграмму с самой собой."})
        
        # Semantic validation for link types
        warnings = []
        
        # data_source should typically point to ERD diagrams
        if link_type == 'data_source' and target_diagram.diagram_type != 'erd':
            warnings.append(
                f"Тип связи 'Источник данных' обычно используется для связи с ERD диаграммами, "
                f"а не с {target_diagram.diagram_type.upper()}."
            )
        
        # decomposition typically links same types or BPMN -> DFD
        if link_type == 'decomposition':
            valid_decompositions = [
                (source_diagram.diagram_type, source_diagram.diagram_type),  # Same type
                ('bpmn', 'dfd'),  # BPMN process can decompose to DFD
                ('bpmn', 'bpmn'),  # BPMN subprocess
            ]
            source_type = source_diagram.diagram_type
            target_type = target_diagram.diagram_type
            if (source_type, target_type) not in valid_decompositions:
                warnings.append(
                    f"Декомпозиция {source_type.upper()} в {target_type.upper()} — нетипичная связь."
                )
        
        # implementation typically links BPMN -> ERD or DFD
        if link_type == 'implementation':
            if source_diagram.diagram_type not in ['bpmn', 'dfd']:
                warnings.append(
                    f"Тип связи 'Реализация' обычно используется для BPMN или DFD диаграмм."
                )
        
        # Store warnings in context for potential frontend display (non-blocking)
        # The link is still created, but warnings are noted
        if warnings:
            attrs['_validation_warnings'] = warnings
        
        return attrs