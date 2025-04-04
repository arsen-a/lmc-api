import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../auth/dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async create(dto: CreateUserDto): Promise<User> {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      ...dto,
      password: hashedPassword,
      isVerified: false, // new field
    });
    return this.userRepository.save(user);
  }

  async verifyByEmail(email: string): Promise<void> {
    await this.userRepository.update({ email }, { isVerified: true });
  }

  async updateVerificationTimestamp(email: string, timestamp: Date) {
    await this.userRepository.update(
      { email },
      { lastVerificationSentAt: timestamp },
    );
  }
}
