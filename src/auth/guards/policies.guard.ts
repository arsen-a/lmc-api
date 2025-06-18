import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CHECK_ABILITY, CheckAbilityParams } from '../decorators/check-abilities.decorator';
import { PureAbility, Subject } from '@casl/ability';
import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject('ABILITY_FACTORY') // Injected dynamically per module
    private readonly abilityFactory: {
      defineAbility(role: any): PureAbility;
    },
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const abilityCheck = this.reflector.get<CheckAbilityParams<string, EntityClassOrSchema>>(
      CHECK_ABILITY,
      context.getHandler(),
    );
    if (!abilityCheck) {
      return true;
    }

    const req = context.switchToHttp().getRequest<{
      role?: string;
      subject?: Subject;
    }>();

    const { role, subject } = req;

    if (!subject || !role) {
      throw new ForbiddenException();
    }

    const ability = this.abilityFactory.defineAbility(role);

    if (!ability.can(abilityCheck.action, subject)) {
      throw new ForbiddenException('You are not allowed to perform this action');
    }

    return true;
  }
}
