import secrets

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Project(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(max_length=255, blank=True, null=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_projects')
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    def __str__(self):
        return self.name


class ProjectMembership(models.Model):
    ROLE_OWNER = 'owner'
    ROLE_EDITOR = 'editor'
    ROLE_VIEWER = 'viewer'

    ROLE_CHOICES = [
        (ROLE_OWNER, 'Owner'),
        (ROLE_EDITOR, 'Editor'),
        (ROLE_VIEWER, 'Viewer'),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='project_memberships')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_EDITOR)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('project', 'user')

    def __str__(self):
        return f'{self.user.username} -> {self.project.name} ({self.role})'


def generate_invite_token() -> str:
    return secrets.token_urlsafe(24)


class ProjectInvite(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='invites')
    token = models.CharField(max_length=64, unique=True, default=generate_invite_token)
    invited_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_invites')
    expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    accepted_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='accepted_invites',
    )
    accepted_at = models.DateTimeField(null=True, blank=True)

    def mark_used(self, user: User):
        self.is_active = False
        self.accepted_by = user
        self.accepted_at = timezone.now()
        self.save(update_fields=['is_active', 'accepted_by', 'accepted_at'])

    @property
    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at

    @property
    def is_valid(self) -> bool:
        return self.is_active and not self.is_expired

    def __str__(self):
        return f'Invite to {self.project.name} (active={self.is_active})'


class Diagram(models.Model):
    DIAGRAM_TYPES = [
        ("bpmn", "BPMN"),
        ("dfd", "DFD"),
        ("erd", "ERD"),
    ]

    name = models.CharField(max_length=100)
    description = models.TextField(max_length=255, blank=True, null=True)
    diagram_type = models.CharField(max_length=10, choices=DIAGRAM_TYPES, default="bpmn")
    data = models.JSONField(default=dict, blank=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='diagrams')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_locked = models.BooleanField(default=False)
    locked_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='locked_diagrams')
    locked_at = models.DateTimeField(null=True, blank=True)


class DiagramLink(models.Model):
    """
    Links between diagram elements.
    An element in source_diagram can link to another diagram (target_diagram),
    creating a navigation network between diagrams.
    """
    LINK_TYPES = [
        ('reference', 'Reference'),  # General reference
        ('decomposition', 'Decomposition'),  # Element breaks down into sub-diagram
        ('implementation', 'Implementation'),  # Element implemented by another diagram
        ('data_source', 'Data Source'),  # Points to data structure (e.g., BPMN DB -> ERD)
    ]

    source_diagram = models.ForeignKey(
        Diagram,
        on_delete=models.CASCADE,
        related_name='outgoing_links'
    )
    source_element_id = models.CharField(max_length=100)
    source_element_label = models.CharField(max_length=255, blank=True, default='')
    
    target_diagram = models.ForeignKey(
        Diagram,
        on_delete=models.CASCADE,
        related_name='incoming_links'
    )
    target_element_id = models.CharField(max_length=100, null=True, blank=True)
    
    link_type = models.CharField(max_length=50, choices=LINK_TYPES, default='reference')
    description = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_links'
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.source_diagram.name}:{self.source_element_id} → {self.target_diagram.name}'


class DiagramTemplate(models.Model):
    """
    User-created diagram templates.
    Users can save their diagrams as templates for reuse.
    """
    DIAGRAM_TYPES = [
        ("bpmn", "BPMN"),
        ("dfd", "DFD"),
        ("erd", "ERD"),
    ]

    name = models.CharField(max_length=100)
    description = models.TextField(max_length=255, blank=True, default='')
    diagram_type = models.CharField(max_length=10, choices=DIAGRAM_TYPES)
    data = models.JSONField(default=dict)  # Stores nodes and edges
    
    # Owner of the template
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='diagram_templates'
    )
    
    # Whether the template is shared with all users in the system
    is_public = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.diagram_type}) by {self.user.username}'

