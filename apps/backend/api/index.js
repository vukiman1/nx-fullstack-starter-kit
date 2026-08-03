// Vercel serverless entry. The Nest app is bundled by webpack (nx build @org/backend) because
// decorator metadata needs tsc — the esbuild pipeline Vercel would use on a .ts entry drops it.
module.exports = require('../dist/serverless.js').default;
