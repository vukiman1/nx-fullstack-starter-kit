import { GeoIpService } from './geo-ip.service';

describe('GeoIpService', () => {
  let service: GeoIpService;

  beforeEach(() => {
    service = new GeoIpService();
  });

  it('returns an empty location when the ip is null', () => {
    expect(service.locate(null)).toEqual({ country: null, city: null });
  });

  it('returns an empty location for a private ip', () => {
    expect(service.locate('10.0.0.1')).toEqual({ country: null, city: null });
  });

  it('returns an empty location for a malformed ip', () => {
    expect(service.locate('not-an-ip')).toEqual({ country: null, city: null });
  });

  it('resolves the country for a known public ip', () => {
    expect(service.locate('8.8.8.8').country).toBe('US');
  });

  it('maps a blank city to null', () => {
    // The bundled country-level dataset has no city for 8.8.8.8
    expect(service.locate('8.8.8.8').city).toBeNull();
  });
});
