import { CreateDateColumn, UpdateDateColumn } from 'typeorm';

import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class EntityHelper {
  @Field()
  @CreateDateColumn({
    type: 'time without time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  public createdAt: Date;

  @Field()
  @UpdateDateColumn({
    type: 'time without time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  public updatedAt: Date;
}
