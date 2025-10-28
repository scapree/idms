from django.shortcuts import render
from rest_framework import generics
from .serializers import ProjectSerializer
from .models import Project


class ProjectApiView(generics.ListCreateAPIView):
    # serializer_class = ProjectSerializer

    # def get_queryset(self):
    #     return Project.objects.all()
        # return Project.objects.filter(user = self.request.user)

    # def post(self, serializer):
    #     return serializer.save(user = self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ProjectDelailApiView(generics.RetrieveAPIView):
    serializer_class = ProjectSerializer

    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)