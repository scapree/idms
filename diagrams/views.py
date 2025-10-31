from django.shortcuts import render
from django.contrib.auth import authenticate

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.authtoken.models import Token
from rest_framework import generics
from rest_framework.response import Response

from .serializers import ProjectSerializer, UserRegistrationSerializer
from .models import Project



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