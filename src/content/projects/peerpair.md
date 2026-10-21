---
title: "PeerPair.dev: pair-programming rooms with live video"
summary: "A Next.js app where developers create and join pair-programming rooms with live video, signing in with Google or GitHub."
problem: "Finding someone to pair with usually means juggling a chat app, a video call and a repo link. PeerPair puts them in one place: a room with a topic, a language, an optional GitHub repo and a live video call."
stack: [Next.js, TypeScript, PostgreSQL, Prisma, NextAuth, Stream Video]
role: "Solo project: design and implementation"
results:
  - "Deployed and live at peerpair-dev.vercel.app."
repo_url: "https://github.com/aniketh3014/peerpair.dev"
demo_url: "https://peerpair-dev.vercel.app"
featured: true
order: 4
---

## Architecture

```mermaid
flowchart LR
  accTitle: PeerPair architecture
  accDescr: The browser talks to a Next.js app. NextAuth handles Google and GitHub sign-in and stores users and sessions in PostgreSQL through Prisma. Server actions manage rooms and issue Stream user tokens; the video call itself runs through Stream.
  B[Browser] --> N[Next.js app]
  N -- "NextAuth: Google / GitHub" --> P[(PostgreSQL via Prisma)]
  N -- "server actions: rooms" --> P
  N -- "server action: user token" --> ST[Stream]
  B -- "live video" --> ST
```

- **Auth**: NextAuth with Google and GitHub providers and the Prisma adapter,
  so users, linked OAuth accounts and sessions live in PostgreSQL.
- **Rooms**: a `Room` belongs to a user and has a name, description,
  language and optional GitHub repo. Creating and deleting rooms are Next.js
  server actions.
- **Video**: the Stream Video React SDK runs in the browser. Its user token
  is created in a server action with the Stream secret, which never reaches
  the client.

## Key decisions

- **Server actions instead of a separate API.** Room changes and token
  issuing live next to the UI that uses them, with no extra service to run.
- **A managed video provider.** Building WebRTC signalling and TURN
  infrastructure would have dwarfed the rest of the app.
- **Cascade deletes in the schema.** Deleting an account removes its
  sessions, OAuth links and rooms in the database, not in application code.
