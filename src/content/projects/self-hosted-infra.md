---
title: "Self-hosted infrastructure with zero public ports"
summary: "A hardened Ubuntu VPS running my own services behind a Tailscale mesh: nothing is reachable from the internet, yet everything has valid TLS."
problem: "I wanted my own password manager, documents, notes and monitoring without trusting a third party, and without the attack surface of exposing self-hosted apps to the internet."
stack:
  [Ubuntu, Tailscale, Nginx, Docker, PostgreSQL, Redis, ufw, fail2ban, Netdata]
role: "Personal infrastructure: design and operations"
results:
  - "Zero publicly reachable ports: every service is only reachable inside the WireGuard mesh."
  - "Valid wildcard TLS certificates for every service, issued through DNS-01 challenges."
featured: true
order: 3
---

## Architecture

```mermaid
flowchart TB
  accTitle: Self-hosted infrastructure
  accDescr: A laptop and a phone join a Tailscale mesh with the VPS. On the VPS, ufw, fail2ban and AdGuard Home sit in front of Nginx, which terminates wildcard TLS and proxies to Vaultwarden, Paperless-ngx, Joplin Server and Netdata, backed by PostgreSQL and Redis.
  L[Laptop] -- Tailscale --> V
  P[Phone] -- Tailscale --> V
  subgraph V[VPS: Ubuntu, ufw + fail2ban + AdGuard Home]
    N[Nginx: wildcard TLS via DNS-01]
    N --> VW[Vaultwarden]
    N --> PL[Paperless-ngx]
    N --> J[Joplin Server]
    N --> ND[Netdata]
    VW & PL & J --> DB[(PostgreSQL + Redis)]
  end
```

- **Network**: devices reach the VPS only over Tailscale, a WireGuard mesh.
  The firewall exposes nothing publicly, so the public attack surface is
  zero ports.
- **TLS**: Nginx terminates TLS with a wildcard certificate. HTTP-01
  challenges can't work when nothing is reachable from the internet, so
  certificates are issued with DNS-01 challenges instead.
- **Services**: Vaultwarden (passwords), Paperless-ngx (documents), Joplin
  Server (notes) and Netdata (telemetry), sharing PostgreSQL and Redis.
- **Hardening**: ufw and fail2ban, with AdGuard Home for DNS filtering.

## Key decisions

- **A private mesh instead of public endpoints.** No login page is ever
  exposed, so there is nothing to brute-force or scan.
- **DNS-01 over HTTP-01.** The certificate authority never needs to reach the
  server, which is what makes "zero public ports" compatible with real TLS.

## Lessons

**Two firewalls, one set of iptables chains.** After a firewall reload, the
containers lost network access. Two firewall layers were rewriting the same
iptables chains, with the WireGuard mesh caught in between. Each was
individually correct and together they were fatal. The fix was to stop
fighting the platform: ufw and fail2ban only, let Docker own its chains, and
run the affected container on host networking.
