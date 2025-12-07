"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path

from diagrams.views import (
    AcceptInviteView,
    CurrentUserView,
    DiagramApiView,
    DiagramDetailApiView,
    DiagramLockView,
    InviteInfoView,
    obtain_token,
    ProjectApiView,
    ProjectDetailApiView,
    ProjectInviteCreateView,
    ProjectInviteDetailView,
    ProjectInviteListView,
    register_user,
)


urlpatterns = [
    path('admin/', admin.site.urls),

    # Auth
    path('api/auth/register', register_user, name='register'),
    path('api/auth/token', obtain_token, name='token'),
    path('api/auth/me', CurrentUserView.as_view(), name='current_user'),

    # Legacy aliases (no /api prefix) for backward compatibility
    path('auth/register', register_user, name='legacy_register'),
    path('auth/token', obtain_token, name='legacy_token'),
    path('auth/me', CurrentUserView.as_view(), name='legacy_current_user'),

    # Projects
    path('api/projects/', ProjectApiView.as_view(), name='projects'),
    path('api/projects/<int:project_id>/', ProjectDetailApiView.as_view(), name='project_detail'),
    path('api/projects/<int:project_id>', ProjectDetailApiView.as_view(), name='project_detail_no_slash'),

    # Legacy project aliases
    path('projects/', ProjectApiView.as_view(), name='legacy_projects'),
    path('projects/<int:project_id>/', ProjectDetailApiView.as_view(), name='legacy_project_detail'),
    path('projects/<int:project_id>', ProjectDetailApiView.as_view(), name='legacy_project_detail_no_slash'),

    # Diagrams
    path('api/projects/<int:project_id>/diagrams/', DiagramApiView.as_view(), name='diagrams'),
    path('api/diagrams/<int:diagram_id>/', DiagramDetailApiView.as_view(), name='diagram_detail'),
    path('api/diagrams/<int:diagram_id>', DiagramDetailApiView.as_view(), name='diagram_detail_no_slash'),
    path('api/diagrams/<int:diagram_id>/lock', DiagramLockView.as_view(), name='diagram_lock'),

    # Legacy diagram aliases
    path('projects/<int:project_id>/diagrams/', DiagramApiView.as_view(), name='legacy_diagrams'),
    path('diagrams/<int:diagram_id>/', DiagramDetailApiView.as_view(), name='legacy_diagram_detail'),
    path('diagrams/<int:diagram_id>', DiagramDetailApiView.as_view(), name='legacy_diagram_detail_no_slash'),
    path('diagrams/<int:diagram_id>/lock', DiagramLockView.as_view(), name='legacy_diagram_lock'),

    # Invites
    path('api/projects/<int:project_id>/invite', ProjectInviteCreateView.as_view(), name='project_invite_create'),
    path('api/projects/<int:project_id>/invites', ProjectInviteListView.as_view(), name='project_invite_list'),
    path('api/projects/<int:project_id>/invites/<int:invite_id>', ProjectInviteDetailView.as_view(), name='project_invite_delete'),
    path('api/invite/<str:token>', InviteInfoView.as_view(), name='invite_info'),
    path('api/invite/<str:token>/accept', AcceptInviteView.as_view(), name='invite_accept'),

    # Legacy invite aliases
    path('projects/<int:project_id>/invite', ProjectInviteCreateView.as_view(), name='legacy_project_invite_create'),
    path('projects/<int:project_id>/invites', ProjectInviteListView.as_view(), name='legacy_project_invite_list'),
    path('projects/<int:project_id>/invites/<int:invite_id>', ProjectInviteDetailView.as_view(), name='legacy_project_invite_delete'),
    path('invite/<str:token>', InviteInfoView.as_view(), name='legacy_invite_info'),
    path('invite/<str:token>/accept', AcceptInviteView.as_view(), name='legacy_invite_accept'),
]
