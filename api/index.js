const { join } = require('path');
const { readFileSync } = require('fs');

// The bundle reads its YAML config through node-config at runtime, which resolves paths
// dynamically — the file tracer cannot see that. Reading each file through a fully static path
// here is what pulls them into the deployed function; `includeFiles` in vercel.json does not.
readFileSync(join(__dirname, '../apps/backend/config/default.yml'));
readFileSync(join(__dirname, '../apps/backend/config/production.yml'));
readFileSync(join(__dirname, '../apps/backend/config/custom-environment-variables.yml'));

// Vercel serverless entry. The Nest app is bundled by webpack (nx build @org/backend) because
// decorator metadata needs tsc — the esbuild pipeline Vercel would use on a .ts entry drops it.
module.exports = require('../apps/backend/dist/serverless.js').default;
