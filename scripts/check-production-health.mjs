const timeoutMs = Number(process.env.IPTRUST_HEALTH_TIMEOUT_MS || 12000);
const attempts = Number(process.env.IPTRUST_HEALTH_ATTEMPTS || 3);

const checks = [
  {
    name: "homepage",
    url: "https://apuch.art/",
    expect: (response, body) => response.ok && /<title>[^<]*(?:IPTrust|岁知社)/i.test(body),
  },
  {
    name: "ip-evolution",
    url: "https://apuch.art/ip-evolution",
    expect: (response, body) => response.ok && /<title>IP进化论\s*\|\s*岁知社 IPTrust<\/title>/i.test(body),
  },
  {
    name: "font-catalog",
    url: "https://apuch.art/api/fonts.json",
    expect: (response, body) => response.ok && Array.isArray(JSON.parse(body).fonts),
  },
  {
    name: "edge-health",
    url: "https://edge.apuch.art/api/v2/health",
    expect: (response, body) => response.ok && JSON.parse(body).ok === true,
  },
  {
    name: "canonical-fullwidth-question",
    url: "https://apuch.art/ip-evolution%EF%BC%9F",
    redirect: "manual",
    expect: (response) => response.status === 302
      && new URL(response.headers.get("location"), "https://apuch.art").pathname === "/ip-evolution"
      && !/(?:immutable|max-age=31536000)/i.test(response.headers.get("cache-control") || ""),
  },
  {
    name: "ip-evolution-cache-repair",
    url: "https://apuch.art/ip-evolution-repair",
    expect: (response, body) => response.ok
      && response.headers.has("clear-site-data")
      && /ip-evolution\?repaired=1/.test(body),
  },
];

async function runCheck(check) {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(check.url, {
      method: "GET",
      redirect: check.redirect || "follow",
      headers: { "User-Agent": "IPTrust-production-health/1.0" },
      signal: controller.signal,
    });
    const body = check.redirect === "manual" ? "" : await response.text();
    const passed = await check.expect(response, body);
    return {
      name: check.name,
      passed,
      status: response.status,
      durationMs: Math.round(performance.now() - started),
      cache: response.headers.get("x-iptrust-cache") || response.headers.get("cf-cache-status") || "-",
    };
  } catch (error) {
    const cause = error instanceof Error && error.cause && typeof error.cause === "object" ? error.cause : null;
    return {
      name: check.name,
      passed: false,
      status: 0,
      durationMs: Math.round(performance.now() - started),
      error: error instanceof Error ? error.message : String(error),
      cause: cause && "code" in cause ? String(cause.code) : "",
    };
  } finally {
    clearTimeout(timer);
  }
}

let failures = [];
for (let attempt = 1; attempt <= attempts; attempt += 1) {
  const results = await Promise.all(checks.map(runCheck));
  failures = results.filter((result) => !result.passed);
  for (const result of results) {
    const state = result.passed ? "PASS" : "FAIL";
    console.log(`${state} attempt=${attempt} check=${result.name} status=${result.status} duration_ms=${result.durationMs} cache=${result.cache || "-"}${result.error ? ` error=${JSON.stringify(result.error)}` : ""}${result.cause ? ` cause=${result.cause}` : ""}`);
  }
  if (!failures.length) break;
  if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 1200));
}

if (failures.length) {
  console.error(`Production health failed: ${failures.map((failure) => failure.name).join(", ")}`);
  process.exitCode = 1;
}
