import { Request } from 'express';
import { GeoIpService } from './geo-ip.service';

function requestWith(headers: Record<string, string>): Request {
  return { headers } as unknown as Request;
}

describe('GeoIpService', () => {
  let service: GeoIpService;

  beforeEach(() => {
    service = new GeoIpService();
  });

  it('returns an empty location when the edge sent no geo headers', () => {
    expect(service.locate(requestWith({}))).toEqual({ country: null, city: null });
  });

  it('reads country and city from the Vercel headers', () => {
    const request = requestWith({ 'x-vercel-ip-country': 'VN', 'x-vercel-ip-city': 'Hanoi' });
    expect(service.locate(request)).toEqual({ country: 'VN', city: 'Hanoi' });
  });

  it('decodes a percent-encoded city name', () => {
    const request = requestWith({ 'x-vercel-ip-city': 'Ho%20Chi%20Minh%20City' });
    expect(service.locate(request).city).toBe('Ho Chi Minh City');
  });

  it('falls back to the Cloudflare country header', () => {
    expect(service.locate(requestWith({ 'cf-ipcountry': 'SG' })).country).toBe('SG');
  });

  it('maps a blank header to null', () => {
    const request = requestWith({ 'x-vercel-ip-country': 'US', 'x-vercel-ip-city': '   ' });
    expect(service.locate(request)).toEqual({ country: 'US', city: null });
  });
});
