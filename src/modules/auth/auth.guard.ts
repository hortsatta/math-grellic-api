import { ExecutionContext, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { UserApprovalStatus, UserRole } from '../user/enums/user.enum';

export function UseLocalAuthGuard() {
  return UseGuards(new LocalAuthGuard());
}

export function UseJwtAuthGuard(roles?: UserRole | UserRole[]) {
  return UseGuards(new JwtAuthGuard(roles));
}

export function UseJwtRefreshAuthGuard() {
  return UseGuards(new JwtRefreshAuthGuard());
}

class LocalAuthGuard extends AuthGuard('local') {}

class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private roles: UserRole | UserRole[]) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    // Run the default JWT AuthGuard to extract user from JWT
    const canActivate = await super.canActivate(context);

    if (
      !canActivate ||
      !request.user ||
      request.user.approvalStatus !== UserApprovalStatus.Approved
    ) {
      return false;
    }

    if (!this.roles) {
      return !!request.user;
    } else {
      const transformedRoles = Array.isArray(this.roles)
        ? this.roles
        : [this.roles];

      const userRole = request.user.role;
      return transformedRoles.some((role) => role === userRole);
    }
  }
}

class JwtRefreshAuthGuard extends AuthGuard('jwt-refresh') {}
