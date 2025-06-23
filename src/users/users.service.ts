import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './users.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
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
    return this.userRepository.findOne({ where: { id } });
  }

  async create(
    dto: Omit<CreateUserDto, 'passwordConfirm'>,
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
}
