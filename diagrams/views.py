from django.shortcuts import render, get_object_or_404
from django.contrib.auth import authenticate

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import ProjectSerializer, UserRegistrationSerializer, DiagramSerializer
from .models import Project, Diagram



@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response({
            "user_id": user.pk,
            "username": user.username,
            "email": user.email
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    username = request.data.get('username')
    password = request.data.get('password')

    user = authenticate(username=username, password=password)
    
    if user:
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            "token": token.key,
        })
    else:
        return Response(
            {"error": "Invalid credentials"}, 
            status=status.HTTP_400_BAD_REQUEST
        )


class ProjectApiView(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        return Project.objects.filter(user = self.request.user)

    def perform_create(self, serializer):
        serializer.save(user = self.request.user)


class ProjectDetailApiView(generics.RetrieveAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]
    
    def get(self, request, project_id):
        project = Project.objects.get(id=project_id)
        serializer = ProjectSerializer(project)
        return Response(serializer.data, status=status.HTTP_200_OK)
    

class DiagramApiView(generics.ListCreateAPIView):
    serializer_class = DiagramSerializer

    def get_queryset(self):
        project_id = self.kwargs["project_id"]
        return Diagram.objects.filter(project = project_id)
    
    def perform_create(self, serializer):
        project = Project.objects.get(id=self.kwargs["project_id"])
        serializer.save(project=project, data={}, locked_by=None, is_locked=False)


class DiagramDetailApiView(APIView):
    serializer_class = DiagramSerializer
    permission_classes = [IsAuthenticated]
    
    def get(self, request, diagram_id):
        diagram = Diagram.objects.get(id=diagram_id)
        serializer = DiagramSerializer(diagram)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, diagram_id):
        diagram = Diagram.objects.get(id=diagram_id)
        serializer = DiagramSerializer(diagram, data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, diagram_id):
        diagram = Diagram.objects.get(id=diagram_id)
        diagram.delete()
        return Response(status=204)
    
