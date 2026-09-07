import { createReviewServer } from './review-server.mjs';
import { demoRuntime } from './review-test-fixture.mjs';
const runtime = demoRuntime();
const server = createReviewServer({ runtime, demo: true });
server.listen(4174, '127.0.0.1');
const stop = () => server.close(() => runtime.close());
process.once('SIGTERM', stop); process.once('SIGINT', stop);
