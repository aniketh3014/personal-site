---
title: "Distributed rate limiter (sample project)"
summary: "PLACEHOLDER sample entry: a Redis-backed token-bucket rate limiter in Go, shared by every API instance."
problem: "Each API instance enforced its own in-memory limit, so the effective limit grew with the number of replicas and one noisy client could still overload the database during autoscaling."
stack: [Go, Redis, AWS ElastiCache, Terraform, Prometheus]
role: "Sole engineer: design, implementation, rollout"
results:
  - "PLACEHOLDER: Limits held within 2% of target across 3 to 40 replicas."
  - "PLACEHOLDER: Added under 1 ms p99 overhead per request."
  - "PLACEHOLDER: Database connection saturation incidents went from weekly to zero."
repo_url: "https://github.com/aniketh3014"
writeup_url: "/blog/example-post/"
featured: true
order: 1
---

## Architecture

```mermaid
flowchart LR
  accTitle: Rate limiter architecture
  accDescr: Clients reach API replicas behind a load balancer; every replica checks a shared Redis token bucket before handling the request.
  C[Clients] --> LB[Load balancer]
  LB --> A1[API replica]
  LB --> A2[API replica]
  A1 -- "EVALSHA token bucket" --> R[(Redis)]
  A2 -- "EVALSHA token bucket" --> R
  A1 --> DB[(PostgreSQL)]
  A2 --> DB
```

Each replica runs one Lua script in Redis per request, so refilling and
taking a token is a single atomic step.

## Key decisions

- **Token bucket in a Lua script, not `INCR` + `EXPIRE`.** One round trip, and
  no race between reading and refilling the bucket.
- **Fail open when Redis is unavailable.** A short Redis outage should not take
  the API down; a local fallback limiter caps the damage.
- **Per-client keys with a TTL.** Idle clients cost nothing, and memory stays
  bounded without a cleanup job.
