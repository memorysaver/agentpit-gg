import { expect, test } from "bun:test";

const baseUrl = process.env.VITE_SERVER_URL;
const run = baseUrl ? test : test.skip;

run("server healthcheck responds", async () => {
  const response = await fetch(`${baseUrl}/`);
  const text = await response.text();
  expect(response.ok).toBe(true);
  expect(text).toBe("OK");
});
