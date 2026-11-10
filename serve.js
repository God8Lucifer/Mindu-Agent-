// Compatibility entry point: use the shared startup and port handling.
require('./server.cjs').start().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
