from app.common.dependencies import require_role
from app.modules.users.models import UserRole

require_admin = require_role(UserRole.ADMIN)
require_user = require_role(UserRole.USER, UserRole.ADMIN)
