import { infrastructureFailureMessage } from './http-request';

describe('infrastructureFailureMessage', () => {
  it('speaks up when the server could not be reached at all', () => {
    expect(infrastructureFailureMessage(undefined)).toBe(
      'Could not reach the server. Check your connection and try again.',
    );
  });

  it('speaks up when the server broke on its own', () => {
    expect(infrastructureFailureMessage(500)).toBeTruthy();
    expect(infrastructureFailureMessage(503)).toBeTruthy();
  });

  it('stays quiet for errors a screen shows inline', () => {
    expect(infrastructureFailureMessage(400)).toBeNull();
    expect(infrastructureFailureMessage(401)).toBeNull();
    expect(infrastructureFailureMessage(403)).toBeNull();
    expect(infrastructureFailureMessage(409)).toBeNull();
    expect(infrastructureFailureMessage(422)).toBeNull();
  });
});
