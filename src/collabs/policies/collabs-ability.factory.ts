import { Injectable } from '@nestjs/common';
import { PureAbility, AbilityBuilder, AbilityClass, ExtractSubjectType } from '@casl/ability';
import { Collab } from '../entities/collab.entity';
import { CollabRole } from '../entities/collab-user.entity';

export type CollabActions = 'read' | 'update' | 'invite' | 'contribute';
export type CollabSubjects = typeof Collab | Collab;
export type CollabAbility = PureAbility<[CollabActions, CollabSubjects]>;

@Injectable()
export class CollabAbilityFactory {
  defineAbility(role: CollabRole): CollabAbility {
    const { can, build } = new AbilityBuilder<CollabAbility>(
      PureAbility as AbilityClass<CollabAbility>,
    );

    if (role === CollabRole.OWNER) {
      can('contribute', Collab);
      can('invite', Collab);
      can('update', Collab);
      can('read', Collab);
    } else if (role === CollabRole.MEMBER) {
      can('contribute', Collab);
      can('read', Collab);
    }

    return build({
      detectSubjectType: (item) => item.constructor as ExtractSubjectType<CollabSubjects>,
    });
  }
}
