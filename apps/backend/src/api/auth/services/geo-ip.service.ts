import { Injectable } from '@nestjs/common';
import { Request } from 'express';

export interface GeoLocation {
  country: string | null;
  city: string | null;
}

const EMPTY_LOCATION: GeoLocation = { country: null, city: null };

/**
 * Geo data comes from the edge that terminated the request — Vercel and Cloudflare both resolve it
 * before it reaches us. Behind a plain reverse proxy the headers are absent and callers get nulls,
 * which the session columns already allow.
 */
@Injectable()
export class GeoIpService {
  locate(request: Request): GeoLocation {
    const country = header(request, 'x-vercel-ip-country') ?? header(request, 'cf-ipcountry');
    const city = header(request, 'x-vercel-ip-city') ?? header(request, 'cf-ipcity');

    if (!country && !city) {
      return EMPTY_LOCATION;
    }
    return { country, city: city && decodeCity(city) };
  }
}

function header(request: Request, name: string): string | null {
  const value = request.headers[name];
  const first = Array.isArray(value) ? value[0] : value;
  const trimmed = first?.trim();
  return trimmed ? trimmed : null;
}

// Vercel percent-encodes city names ("Ho%20Chi%20Minh%20City")
function decodeCity(value: string): string | null {
  try {
    const decoded = decodeURIComponent(value).trim();
    return decoded ? decoded : null;
  } catch {
    return value;
  }
}
