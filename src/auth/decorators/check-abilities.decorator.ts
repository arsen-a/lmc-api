import { SetMetadata } from '@nestjs/common';
import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';

export const CHECK_ABILITY = 'check_ability';

export interface CheckAbilityParams<TAction, TSubject> {
  action: TAction;
  subject: TSubject;
}

export const CheckAbilities = <TAction, TSubject extends EntityClassOrSchema>(
  params: CheckAbilityParams<TAction, TSubject>,
) => SetMetadata(CHECK_ABILITY, params);
