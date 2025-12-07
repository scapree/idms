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

from .models import Diagram, DiagramLink, Project, ProjectInvite, ProjectMembership
from .serializers import (
    DiagramLinkCreateSerializer,
    DiagramLinkSerializer,
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
        
        # Safe data handling
        data_to_update = request.data
        if hasattr(request.data, 'copy'):
            data_to_update = request.data.copy()

        if 'data' in data_to_update:
            diagram_data = data_to_update['data']
            # If it comes as a string, parse it. If it's a dict, leave it.
            if isinstance(diagram_data, str):
                try:
                    diagram_data = json.loads(diagram_data)
                except json.JSONDecodeError:
                    # If invalid json, maybe it's just a string, let serializer validation handle it
                    pass
            data_to_update['data'] = diagram_data

        serializer = DiagramSerializer(diagram, data=data_to_update, partial=True)
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


# --- Diagram Links ---

class DiagramLinksView(APIView):
    """
    GET: List all links for a diagram (both outgoing and incoming)
    POST: Create a new link from an element in this diagram to another diagram
    """
    permission_classes = [IsAuthenticated]

    def _get_diagram(self, diagram_id, user):
        diagram = get_object_or_404(Diagram, id=diagram_id)
        _ensure_project_member(diagram.project, user)
        return diagram

    def get(self, request, diagram_id):
        diagram = self._get_diagram(diagram_id, request.user)
        
        # Get outgoing links (from elements in this diagram to other diagrams)
        outgoing = DiagramLink.objects.filter(source_diagram=diagram).select_related(
            'target_diagram', 'created_by'
        )
        
        # Get incoming links (from other diagrams pointing to this one)
        incoming = DiagramLink.objects.filter(target_diagram=diagram).select_related(
            'source_diagram', 'created_by'
        )
        
        return Response({
            'outgoing': DiagramLinkSerializer(outgoing, many=True).data,
            'incoming': DiagramLinkSerializer(incoming, many=True).data,
        }, status=status.HTTP_200_OK)

    def post(self, request, diagram_id):
        diagram = self._get_diagram(diagram_id, request.user)
        
        serializer = DiagramLinkCreateSerializer(
            data=request.data,
            context={'request': request, 'source_diagram': diagram}
        )
        
        if serializer.is_valid():
            # Verify user has access to target diagram
            target_diagram = serializer.validated_data['target_diagram']
            try:
                _ensure_project_member(target_diagram.project, request.user)
            except PermissionDenied:
                return Response(
                    {"detail": "You don't have access to the target diagram."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            
            link = serializer.save(
                source_diagram=diagram,
                created_by=request.user
            )
            return Response(
                DiagramLinkSerializer(link).data,
                status=status.HTTP_201_CREATED,
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DiagramLinkDetailView(APIView):
    """
    GET: Get a specific link
    DELETE: Remove a link
    """
    permission_classes = [IsAuthenticated]

    def _get_link(self, link_id, user):
        link = get_object_or_404(DiagramLink, id=link_id)
        _ensure_project_member(link.source_diagram.project, user)
        return link

    def get(self, request, link_id):
        link = self._get_link(link_id, request.user)
        return Response(DiagramLinkSerializer(link).data, status=status.HTTP_200_OK)

    def delete(self, request, link_id):
        link = self._get_link(link_id, request.user)
        link.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ElementLinksView(APIView):
    """
    GET: Get links for a specific element in a diagram
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, diagram_id, element_id):
        diagram = get_object_or_404(Diagram, id=diagram_id)
        _ensure_project_member(diagram.project, request.user)
        
        links = DiagramLink.objects.filter(
            source_diagram=diagram,
            source_element_id=element_id
        ).select_related('target_diagram', 'created_by')
        
        return Response(DiagramLinkSerializer(links, many=True).data, status=status.HTTP_200_OK)


class ProjectDiagramsForLinkingView(APIView):
    """
    GET: Get all diagrams the user can link to (from all their projects)
    Useful for the link selection modal
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Get all projects user has access to
        projects = Project.objects.filter(
            memberships__user=request.user
        ).prefetch_related('diagrams').distinct()
        
        result = []
        for project in projects:
            project_data = {
                'id': project.id,
                'name': project.name,
                'diagrams': [
                    {
                        'id': d.id,
                        'name': d.name,
                        'diagram_type': d.diagram_type,
                    }
                    for d in project.diagrams.all()
                ]
            }
            result.append(project_data)
        
        return Response(result, status=status.HTTP_200_OK)