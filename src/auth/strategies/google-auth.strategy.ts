import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Config } from 'src/config/config.type';
import { GoogleStrategyUserPayload } from 'src/auth/auth.types';

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
    profile: Profile,
    done: VerifyCallback,
  ) {
    const { emails, name } = profile;
    if (!emails?.length || !name) {
      return done(new Error('Google profile does not satisfy API requirements'));
    }
    const email = emails[0].value;
    const firstName = name.givenName;
    const lastName = name.familyName;

    const userPayload: GoogleStrategyUserPayload = {
      email,
      firstName,
      lastName,
    };

    done(null, userPayload);
  }
}
