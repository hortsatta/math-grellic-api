import { CanActivate, ExecutionContext, UseGuards } from '@nestjs/common';
import { UserApprovalStatus, UserRole } from '#/modules/user/enums/user.enum';

export function UseAuthGuard(roles?: UserRole | UserRole[]) {
  return UseGuards(new AuthGuard(roles));
}

class AuthGuard implements CanActivate {
  constructor(private roles: UserRole | UserRole[]) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    if (
      !request.raw.currentUser ||
      request.raw.currentUser.approvalStatus !== UserApprovalStatus.Approved
    ) {
      return false;
    }

    if (!this.roles) {
      return !!request.raw.currentUser;
    } else {
      const transformedRoles = Array.isArray(this.roles)
        ? this.roles
        : [this.roles];

      const userRole = request.raw.currentUser.role;
      return transformedRoles.some((role) => role === userRole);
    }
  }
}
