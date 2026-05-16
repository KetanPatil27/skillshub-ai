"""Aggregator so Alembic's autogenerate sees every mapped class."""

from app.core.database import Base  # noqa: F401
from app.modules.employees.models import Employee, Project, Skill  # noqa: F401
from app.modules.review.models import ReviewQueueItem  # noqa: F401
from app.modules.search.models import SavedSearch, SearchQueryLog  # noqa: F401
from app.modules.users.models import User  # noqa: F401
