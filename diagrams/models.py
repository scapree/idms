from django.db import models
from django.contrib.auth.models import User


class Project(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(max_length=255, blank=True, null=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    def __str__(self):
        return self.name


class Diagram(models.Model):
    DIAGRAM_TYPES = [
        ("bpmn", "BPMN"),
        ("dfd", "DFD"),
        ("er", "ER"),
    ]

    name = models.CharField(max_length=100)
    description = models.TextField(max_length=255, blank=True, null=True)
    type = models.CharField(max_length=10, choices=DIAGRAM_TYPES)
    data = models.JSONField()
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='diagrams')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_locked = models.BooleanField(default=False)
    locked_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='locked_diagrams')


class Relation(models.Model):
    diagram = models.ForeignKey(Diagram, on_delete=models.CASCADE, related_name='source')
    element_id = models.CharField(max_length=100)
    target_diagram = models.ForeignKey(Diagram, on_delete=models.CASCADE, related_name='target')
    tagret_element_id = models.CharField(max_length=100, null=True)
    relation_type = models.CharField(max_length=100)

