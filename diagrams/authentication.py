from rest_framework.authentication import TokenAuthentication, get_authorization_header


class FlexibleTokenAuthentication(TokenAuthentication):
    """
    Accept both `Token <key>` and `Bearer <key>` headers so the frontend
    can keep using the more common Bearer schema.
    """

    def authenticate(self, request):
        auth = get_authorization_header(request).split()
        if not auth:
            return None

        keyword = auth[0].lower()
        if keyword not in (b'bearer', b'token'):
            return None

        if len(auth) == 1:
            return None

        if len(auth) > 2:
            return None

        token = auth[1].decode()
        return self.authenticate_credentials(token)

