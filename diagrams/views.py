from datetime import timedelta
import json

from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import generics, status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Diagram, Project, ProjectInvite, ProjectMembership
from .serializers import (
    DiagramSerializer,
    ProjectInviteInfoSerializer,
    ProjectInviteSerializer,
    ProjectSerializer,
    UserRegistrationSerializer,
    UserSerializer,
)


def _ensure_project_member(project: Project, user) -> None:
    if not ProjectMembership.objects.filter(project=project, user=user).exists():
        raise PermissionDenied("You do not have access to this project.")


def _ensure_project_owner(project: Project, user) -> None:
    if not ProjectMembership.objects.filter(
        project=project,
        user=user,
        role=ProjectMembership.ROLE_OWNER,
    ).exists():
        raise PermissionDenied("Only project owners can perform this action.")


def _get_project_for_user(project_id: int, user) -> Project:
    project = get_object_or_404(Project, id=project_id)
    _ensure_project_member(project, user)
    return project


def _serialize_lock(diagram: Diagram):
    return {
        "diagram_id": diagram.id,
        "is_locked": diagram.is_locked,
        "locked_at": diagram.locked_at,
        "user": UserSerializer(diagram.locked_by).data if diagram.locked_by else None,
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    data = request.data.copy()
    if 'confirmPassword' in data and 'password2' not in data:
        data['password2'] = data['confirmPassword']

    serializer = UserRegistrationSerializer(data=data)
    if serializer.is_valid():
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def obtain_token(request):
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response(
            {"detail": "Username and password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate(username=username, password=password)
    if not user:
        return Response(
            {"detail": "Invalid credentials."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    token, _ = Token.objects.get_or_create(user=user)
    return Response(
        {
            "access_token": token.key,
            "token_type": "Bearer",
        },
        status=status.HTTP_200_OK,
    )


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)


class ProjectApiView(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Project.objects.filter(memberships__user=self.request.user)
            .select_related('user')
            .distinct()
        )

    def perform_create(self, serializer):
        project = serializer.save(user=self.request.user)
        ProjectMembership.objects.get_or_create(
            project=project,
            user=self.request.user,
            defaults={'role': ProjectMembership.ROLE_OWNER},
        )


class ProjectDetailApiView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]
    lookup_url_kwarg = 'project_id'

    def get_queryset(self):
        return Project.objects.filter(memberships__user=self.request.user).distinct()

    def perform_update(self, serializer):
        project = self.get_object()
        _ensure_project_owner(project, self.request.user)
        serializer.save()

    def perform_destroy(self, instance):
        _ensure_project_owner(instance, self.request.user)
        instance.delete()


class DiagramApiView(generics.ListCreateAPIView):
    serializer_class = DiagramSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        project = _get_project_for_user(self.kwargs["project_id"], self.request.user)
        return project.diagrams.all()

    def perform_create(self, serializer):
        project = _get_project_for_user(self.kwargs["project_id"], self.request.user)
        serializer.save(project=project, locked_by=None, is_locked=False)


class DiagramDetailApiView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_diagram(self, diagram_id, user):
        diagram = get_object_or_404(Diagram, id=diagram_id)
        _ensure_project_member(diagram.project, user)
        return diagram

    def get(self, request, diagram_id):
        diagram = self._get_diagram(diagram_id, request.user)
        serializer = DiagramSerializer(diagram)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, diagram_id):
        diagram = self._get_diagram(diagram_id, request.user)
        
        # Manually extract data to ensure JSON structure is preserved
        update_data = request.data.copy()
        if 'data' in request.data:
            # Ensure 'data' is treated as a raw dictionary/json object
            diagram_data = request.data['data']
            if isinstance(diagram_data, str):
                try:
                    diagram_data = json.loads(diagram_data)
                except json.JSONDecodeError:
                    pass
            update_data['data'] = diagram_data

        serializer = DiagramSerializer(diagram, data=update_data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, diagram_id):
        diagram = self._get_diagram(diagram_id, request.user)
        diagram.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DiagramLockView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_diagram(self, diagram_id, user):
        diagram = get_object_or_404(Diagram, id=diagram_id)
        _ensure_project_member(diagram.project, user)
        return diagram

    def get(self, request, diagram_id):
        diagram = self._get_diagram(diagram_id, request.user)
        return Response(_serialize_lock(diagram), status=status.HTTP_200_OK)

    def post(self, request, diagram_id):
        diagram = self._get_diagram(diagram_id, request.user)

        if not diagram.is_locked or diagram.locked_by == request.user:
            diagram.is_locked = True
            diagram.locked_by = request.user
            diagram.locked_at = timezone.now()
            diagram.save(update_fields=['is_locked', 'locked_by', 'locked_at'])

        return Response(_serialize_lock(diagram), status=status.HTTP_200_OK)

    def delete(self, request, diagram_id):
        diagram = self._get_diagram(diagram_id, request.user)
        if diagram.locked_by != request.user:
            raise PermissionDenied("Only the locking user can release this diagram.")

        diagram.is_locked = False
        diagram.locked_by = None
        diagram.locked_at = None
        diagram.save(update_fields=['is_locked', 'locked_by', 'locked_at'])
        return Response(_serialize_lock(diagram), status=status.HTTP_200_OK)


class ProjectInviteCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, project_id):
        project = _get_project_for_user(project_id, request.user)
        _ensure_project_owner(project, request.user)

        expires_in_hours = request.data.get('expires_in_hours', 24)
        try:
            expires_in_hours = int(expires_in_hours)
        except (TypeError, ValueError):
            return Response(
                {"detail": "expires_in_hours must be an integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        expires_at = timezone.now() + timedelta(hours=max(expires_in_hours, 1))
        invite = ProjectInvite.objects.create(
            project=project,
            invited_by=request.user,
            expires_at=expires_at,
        )
        serializer = ProjectInviteSerializer(invite)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ProjectInviteListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        project = _get_project_for_user(project_id, request.user)
        _ensure_project_owner(project, request.user)
        invites = project.invites.order_by('-created_at')
        serializer = ProjectInviteSerializer(invites, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ProjectInviteDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, project_id, invite_id):
        project = _get_project_for_user(project_id, request.user)
        _ensure_project_owner(project, request.user)
        invite = get_object_or_404(ProjectInvite, id=invite_id, project=project)
        invite.is_active = False
        invite.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class InviteInfoView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        invite = get_object_or_404(ProjectInvite, token=token)
        data = ProjectInviteInfoSerializer(
            {
                "project_id": invite.project_id,
                "project_name": invite.project.name,
                "project_description": invite.project.description,
                "owner_username": invite.project.user.username,
                "is_valid": invite.is_valid,
                "is_expired": invite.is_expired,
                "expires_at": invite.expires_at,
            }
        ).data
        return Response(data, status=status.HTTP_200_OK)


class AcceptInviteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, token):
        invite = get_object_or_404(ProjectInvite, token=token)
        if not invite.is_valid:
            return Response(
                {"detail": "Invite is no longer valid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ProjectMembership.objects.get_or_create(
            project=invite.project,
            user=request.user,
            defaults={'role': ProjectMembership.ROLE_EDITOR},
        )
        invite.mark_used(request.user)

        return Response(
            {"project_id": invite.project_id},
            status=status.HTTP_200_OK,
        )