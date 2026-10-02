"""Framework-independent application errors mapped at the HTTP boundary."""


class DomainError(Exception):
    code = "domain_error"

    def __init__(self, detail: str):
        self.detail = detail
        super().__init__(detail)


class ResourceNotFound(DomainError):
    code = "not_found"


class ActionForbidden(DomainError):
    code = "forbidden"


class ResourceConflict(DomainError):
    code = "conflict"


class ServiceUnavailable(DomainError):
    code = "service_unavailable"
