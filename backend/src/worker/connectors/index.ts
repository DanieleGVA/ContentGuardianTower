import type { Source } from '@prisma/client';
import type { IConnector } from './base.connector.js';
import { WebConnector } from './web.connector.js';
import { FacebookConnector } from './facebook.connector.js';
import { InstagramConnector } from './instagram.connector.js';
import { LinkedInConnector } from './linkedin.connector.js';
import { YouTubeConnector } from './youtube.connector.js';

export function getConnectorForSource(source: Source): IConnector {
  switch (source.channel) {
    case 'WEB':
      return new WebConnector();
    case 'FACEBOOK':
      return new FacebookConnector();
    case 'INSTAGRAM':
      return new InstagramConnector();
    case 'LINKEDIN':
      return new LinkedInConnector();
    case 'YOUTUBE':
      return new YouTubeConnector();
    default:
      throw new Error(`No connector available for channel '${source.channel}'`);
  }
}
