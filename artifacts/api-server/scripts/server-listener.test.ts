import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mock, test } from "node:test";
import {
  assertApiRuntimeEnvironment,
  listenForRequests,
} from "../src/lib/serverListener";

test("runtime requires an explicit production or development mode", () => {
  assert.doesNotThrow(() => assertApiRuntimeEnvironment(undefined, "production", false));
  assert.doesNotThrow(() => assertApiRuntimeEnvironment(undefined, "development", false));

  for (const nodeEnv of [undefined, "", "test", "staging"]) {
    assert.throws(
      () => assertApiRuntimeEnvironment(undefined, nodeEnv, false),
      /NODE_ENV must be explicitly set/,
    );
  }
});

test("Passenger runtime requires production mode and Plesk media storage", () => {
  const passenger = { configure() {} };
  assert.doesNotThrow(() =>
    assertApiRuntimeEnvironment(passenger, "production", true),
  );
  assert.throws(
    () => assertApiRuntimeEnvironment(passenger, "development", true),
    /Passenger requires NODE_ENV=production/,
  );
  assert.throws(
    () => assertApiRuntimeEnvironment(passenger, "production", false),
    /Passenger requires PLESK_MEDIA_DIR/,
  );
});

test("Passenger configures its socket before listen, without requiring PORT", () => {
  const server = createServer();
  const events: unknown[] = [];
  const ready = () => {};
  mock.method(server, "listen", (...args: unknown[]) => {
    events.push(args);
    return server;
  });
  listenForRequests(server, undefined, {
    configure(options) { events.push(options); },
  }, ready);
  assert.deepEqual(events, [{ autoInstall: false }, ["passenger", ready]]);
});

test("Passenger controls listening even when PORT is a name or a TCP value", () => {
  for (const port of ["passenger", "/tmp/passenger.sock", "3000"]) {
    const server = createServer();
    const listener = mock.method(server, "listen", () => server);
    listenForRequests(server, port, { configure() {} }, () => {});
    assert.equal(listener.mock.calls[0].arguments[0], "passenger");
  }
});

test("standalone Node keeps numeric PORT and the public listening address", () => {
  const server = createServer();
  const listener = mock.method(server, "listen", () => server);
  const ready = () => {};
  listenForRequests(server, "8080", undefined, ready);
  assert.deepEqual(listener.mock.calls[0].arguments, [8080, "0.0.0.0", ready]);
});

test("standalone Node rejects missing or invalid ports without opening a listener", () => {
  for (const port of [undefined, "", "passenger", "0", "-1", "65536", "8080.5", "NaN"]) {
    const server = createServer();
    const listener = mock.method(server, "listen", () => server);
    assert.throws(() => listenForRequests(server, port, undefined, () => {}), /PORT/);
    assert.equal(listener.mock.callCount(), 0);
  }
});
