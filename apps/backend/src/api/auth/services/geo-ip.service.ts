import { Injectable } from '@nestjs/common';
import * as geoip from 'geoip-lite';

export interface GeoLocation {
  country: string | null;
  city: string | null;
}

const EMPTY_LOCATION: GeoLocation = { country: null, city: null };

@Injectable()
export class GeoIpService {
  locate(ip: string | null): GeoLocation {
    if (!ip) {
      return EMPTY_LOCATION;
    }
    const match = geoip.lookup(ip);
    if (!match) {
      return EMPTY_LOCATION;
    }
    return {
      country: blankToNull(match.country),
      city: blankToNull(match.city),
    };
  }
}

function blankToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
