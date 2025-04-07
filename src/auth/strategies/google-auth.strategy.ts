import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Config } from 'src/config/config.type';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    const googleConfig = configService.get<Config['google']>('google');
    if (!googleConfig) {
      throw new Error('Google configuration is not set');
    }
    const appUrl = configService.get<string>('app.url');
    const callbackUrl = `${appUrl}/api/auth/google/callback`;
    super({
      clientID: googleConfig.clientId,
      clientSecret: googleConfig.clientSecret,
      callbackURL: callbackUrl,
      scope: ['profile', 'email'],
      passReqToCallback: true,
    });
  }

  validate(
    _: unknown,
    _accessToken: string,
    _refreshToken: string,
    profile: { emails: { value: string }[]; id: string },
    done: VerifyCallback,
  ) {
    const email = profile.emails[0].value;
    const sub = profile.id;
    done(null, { email, sub });
  }
}
