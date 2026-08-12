# Intermittent connectivity on 2026-08-12

## Impact

The in-app browser and the local production probe intermittently could not
open the homepage, IP Evolution page, font API or independent Worker health
endpoint. All five requests failed during the same 10-second window.

## Evidence

- The failure affected both Cloudflare Pages and `edge.apuch.art` at once.
- The same endpoints returned HTTP 200 immediately before and after the event.
- DNS on the affected Mac resolved the domains into `198.18.0.0/15`, the local
  proxy's synthetic-address range, rather than the public Cloudflare addresses.
- macOS HTTP and HTTPS traffic was configured through `127.0.0.1:8234`.
- Public DNS returned Cloudflare addresses and direct pinned-address checks
  returned HTTP 200 after the event.

## Assessment

The observed outage was on the local proxy/DNS transit path. It did not match a
single Pages route failure or a Worker application crash. The simultaneous
failure remains reproducible evidence and should be correlated with Cloudflare
external monitoring before declaring future events application outages.

## Changes

- Added `npm run check:production` with retries and content assertions.
- Moved the production check to the post-deploy workflow so a transient
  external failure cannot block a recovery build before deployment.
- Kept the Worker health endpoint independent from Pages.
- Documented the production/source synchronization contract.
