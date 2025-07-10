import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from 'src/auth/auth.dto';
import { UserChange, UserChangeType } from './entities/user-change.entity';
import { randomBytes } from 'crypto';
import { UpdateMeDto } from './dto/update-me.dto';
import { CreateUserChangeDto } from './dto/create-user-change.dto';
import { MailService } from 'src/mail/mail.service';
import { SECURE_UPDATE_TTL } from './user.constants';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserChange)
    private userChangeRepository: Repository<UserChange>,
    private readonly mailService: MailService,
  ) {}

  async findByEmail(email?: string): Promise<User | null> {
    if (!email) {
      throw new NotFoundException();
    }
    return this.userRepository.findOne({ where: { email } });
  }

  async findById(id?: string): Promise<User | null> {
    if (!id) {
      throw new NotFoundException();
    }
    return this.userRepository.findOne({ where: { id }, loadEagerRelations: false });
  }

  async create(
    dto: Omit<RegisterDto, 'passwordConfirm'>,
    isVerified: boolean = false,
  ): Promise<User> {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      ...dto,
      password: hashedPassword,
      isVerified,
    });
    return this.userRepository.save(user);
  }

  async update(user: User, data: UpdateMeDto) {
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { firstName, lastName } = data;

    if (firstName === user.firstName && lastName === user.lastName) {
      return user;
    }

    if (firstName) {
      user.firstName = firstName;
    }

    if (lastName) {
      user.lastName = lastName;
    }

    return this.userRepository.save(user);
  }

  async verifyUser(email: string): Promise<User> {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new NotFoundException();
    }
    if (user.isVerified) {
      throw new BadRequestException('User is already verified');
    }
    user.isVerified = true;
    return await this.userRepository.save(user);
  }

  async updateVerificationTimestamp(email: string, timestamp: Date) {
    await this.userRepository.update({ email }, { lastVerificationSentAt: timestamp });
  }

  async secureUpdate(user: User, body: CreateUserChangeDto) {
    const passwordValid = await bcrypt.compare(body.password, user.password);

    if (!passwordValid) {
      throw new BadRequestException('Incorrect password');
    }

    const userChange = new UserChange();
    userChange.user = user;
    userChange.type = body.type;
    userChange.token = randomBytes(32).toString('hex');

    if (body.type === UserChangeType.Email) {
      userChange.newValue = body.newEmail;
    }

    if (body.type === UserChangeType.Password) {
      userChange.newValue = await bcrypt.hash(body.newPassword, 10);
    }

    const { token, type } = await this.userChangeRepository.save(userChange);

    if (!token) {
      throw new BadRequestException('Secure update token not generated');
    }

    if (type === UserChangeType.Email) {
      await this.mailService.sendSecureEmailChange({
        recipient: body.newEmail,
        user,
        token,
        type,
      });
    }

    if (type === UserChangeType.Password) {
      await this.mailService.sendNewPasswordChange({
        user,
        token,
        type,
      });
    }
  }

  async verifySecureUpdate(token: string, type: UserChangeType) {
    const userChange = await this.userChangeRepository.findOne({
      where: { token, type },
      relations: ['user'],
    });

    if (!userChange || userChange.confirmedAt) {
      throw new NotFoundException('Secure update was not initiated or is already confirmed');
    }

    if (userChange.createdAt.getTime() + SECURE_UPDATE_TTL < Date.now()) {
      throw new BadRequestException('Secure update token expired');
    }

    const { user, newValue } = userChange;

    if (type === UserChangeType.Email) {
      user.email = newValue;
    }

    if (type === UserChangeType.Password) {
      user.password = newValue;
    }

    await this.userRepository.save(user);
    userChange.confirmedAt = new Date();
    await this.userChangeRepository.save(userChange);
  }
}
