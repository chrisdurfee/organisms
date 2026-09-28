# Rally prod migration: Hetzner (5.78.89.171) → OVHcloud VPS-4

Goal: move the `rally` compose stack to the new OVH box with a short maintenance window and no data loss. Keep Hetzner intact as the rollback path until Chris says to cancel it.

## Phase 0: read-only prep on Hetzner (do now, change nothing)
Report back:
1. `docker volume ls` + size of each volume, and which container mounts what (`docker inspect -f '{{.Name}} {{json .Mounts}}' $(docker ps -q)`). Explain the 68G used vs 13G /opt (probably /var/lib/docker: images, volumes, logs).
2. How is `rally-web:latest` produced: built on the box, pulled from a registry, or pushed from CI? What's the deploy command/flow, and does anything (GitHub Actions, scripts) SSH to 5.78.89.171 by IP or hostname?
3. TLS in `rally-edge`: Cloudflare Origin CA cert, Let's Encrypt inside a container, or something else? Where do the cert files live?
4. Host firewall: `ufw status verbose` / `iptables -S` / `nft list ruleset`. Is 80/443 restricted to Cloudflare IPs? Is SSH key-only?
5. Role of `rally-redis` vs `rally-redis-session`: which hold data we must keep (queues, sessions) vs pure cache? Is AOF/RDB persistence on?
6. Where `backup-database.sh` writes, and whether any backup leaves the box.
7. Anything in `.env` that is IP-bound (APP_URL, trusted proxies, SendGrid/Stripe settings).

## Phase 1: new box setup (after Chris orders and shares the IP)
- Ubuntu 24.04 (same as prod). Non-root sudo user, SSH key-only, disable password + root login.
- Docker Engine + compose plugin from Docker's official apt repo (match the prod versions).
- Firewall: 22 (limit it to Chris's IP if practical), 80/443 (Cloudflare IP ranges only if prod does that today).
- Same cron jobs: 03:15 DB backup, Sunday 04:00 prune. **Do not start the scheduler yet.**
- Timezone/NTP same as prod. Add swap if prod has it.

## Phase 2: dry run (prod stays live)
- rsync `/opt/rally` to the new box (compose files, `.env`, certs, nginx config, scripts).
- Get the image there: `docker save rally-web:latest | ssh new 'docker load'`, or build/pull the same way prod does.
- Restore last night's DB backup into the new mariadb container. Bring up edge, web, mariadb and redis. **Keep rally-scheduler stopped** so jobs don't run twice.
- Test without DNS: `curl -k --resolve app.rally-app.co:443:<NEW_IP> https://app.rally-app.co/` plus the API health endpoint(s). Check logs for errors.

## Phase 3: cutover (Chris picks the window)
1. Put prod in maintenance mode, or stop `rally-web-candidate` and `rally-scheduler` on Hetzner.
2. Final `mariadb-dump --single-transaction --routines --triggers --events` on Hetzner, copy it over, restore on new. Copy the Redis RDB files if Phase 0 says they matter.
3. Start the full stack on new, including the scheduler.
4. Chris/Claude switch the Cloudflare A/AAAA records to the new IP. Proxied records take effect almost immediately.
5. Smoke test: web login, API, native app (same cookies/start URL), Stripe test webhook, SendGrid test email, scheduler jobs.
6. Leave the Hetzner containers **stopped, not removed**. If anything breaks, point DNS back.

## Hard rules
- No destructive commands on Hetzner (no `down -v`, no volume/image removal, no prune) until Chris approves decommissioning.
- Never run the scheduler on both boxes at the same time.
- Return format: did / found / recommend / need / unverified.
