export {};

declare module 'express' {
  interface Request {
    sessionJti?: string;
  }
}
