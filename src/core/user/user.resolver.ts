import { Args, Context, Mutation, Parent, Query, ResolveProperty, Resolver } from '@nestjs/graphql';

import { ID } from 'type-graphql';

import DataLoader from 'dataloader';
import { Loader } from '../../graphql/loader/loader.decorator';

import { passwordToHash } from '../../common/helpers/pswd.helper';

import { User } from './user.entity';
import { UserService } from './user.service';

import { Permission } from '../permission/permission.entity';
import { PermissionLoader } from '../permission/permission.loader';
import { PermissionService } from '../permission/permission.service';

import { CreateUserDTO } from './dto/create.dto';
import { UpdateUserDTO } from './dto/update.dto';

// tslint:disable: no-unsafe-any
@Loader(PermissionLoader)
@Resolver(() => User)
export class UserResolver {
  constructor(private readonly userService: UserService, private readonly permissionService: PermissionService) {}

  @Query(() => User)
  public async user(@Args({ name: 'id', type: () => ID }) id: string) {
    return await this.userService.findOne(id);
  }

  @Query(() => [User])
  public async users(): Promise<User[]> {
    return await this.userService.findAll();
  }

  @Mutation(() => User)
  public async userCreate(@Args('data') createUserInput: CreateUserDTO) {
    const data = { ...createUserInput };
    data.password = passwordToHash(createUserInput.password);

    return await this.userService.create(data);
  }

  @Mutation(() => User)
  public async userUpdate(
    @Args({ name: 'id', type: () => ID }) id: string,
    @Args('data') updateUserInput: UpdateUserDTO
  ) {
    return await this.userService.update(id, updateUserInput, { relations: ['permissions'] });
  }

  @Mutation(() => User)
  public async userDelete(@Args({ name: 'id', type: () => ID }) id: string) {
    return await this.userService.delete(id, { relations: ['permissions'] });
  }

  @Mutation(() => User)
  public async userAddPermission(
    @Args({ name: 'userId', type: () => ID }) userId: string,
    @Args({ name: 'permissionId', type: () => ID }) permissionId: number
  ) {
    const user = await this.userService.findOne(userId, { relations: ['permissions'] });
    const permission = await this.permissionService.findOne(permissionId);

    user.permissions.push(permission);

    return await this.userService.save(user);
  }

  @Loader(PermissionLoader)
  @ResolveProperty()
  public async permissions(
    @Parent() user: User,
    @Context('PermissionLoader') permissionLoader: DataLoader<string, Permission[]>
  ) {
    return await permissionLoader.load(user.id);
  }
}
// tslint:enable: no-unsafe-any
