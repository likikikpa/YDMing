import { createApp, readServerConfig } from "./server-app.mjs";

try {
  const { host, port, trustProxy, search } = readServerConfig();
  const app = createApp({ trustProxy, search });
  const server = app.listen(port, host, () => {
    const address = server.address();
    const displayHost =
      host === "0.0.0.0"
        ? "127.0.0.1"
        : host.includes(":")
          ? `[${host}]`
          : host;
    console.log(`YDMing is ready at http://${displayHost}:${address.port}`);
  });
  server.on("error", (error) => {
    console.error(`YDMing could not start: ${error.message}`);
    process.exitCode = 1;
  });
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => {
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 5000).unref();
    });
  }
} catch (error) {
  console.error(`YDMing could not start: ${error.message}`);
  process.exitCode = 1;
}
