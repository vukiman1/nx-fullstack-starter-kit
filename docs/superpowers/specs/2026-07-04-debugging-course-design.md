# Debugging Course — Design

Date: 2026-07-04
Status: Approved

## Goal

A small hands-on course (Vietnamese, in-repo markdown) teaching VSCode and Chrome DevTools
debugging, using this project's real auth/session flows as the practice ground.

## Scope (user-selected)

- Backend NestJS debugging in VSCode (attach to `nx serve` on port 9229).
- Frontend React debugging in Chrome DevTools (Sources, Network, React DevTools).
- Jest test debugging in VSCode.
- Out of scope: VSCode browser-debug configs (`type: chrome`), production debugging.

## Format

- `docs/debugging-course/00-setup.md` … `05-missions.md` — sequential lessons, each with
  goals + hands-on exercises anchored to real files on `dev`.
- Learning style: hybrid — modules 01–04 are guided walkthroughs; module 05 is three
  "missions" with planted bugs the learner hunts using skills from earlier modules.

## Missions branch

- Planted bugs live only on branch `learn/debugging-missions` (from `dev`), never merged.
- Mission briefs, hints, and solutions live on that branch under
  `docs/debugging-course/missions/` so docs can never drift from the actual planted bugs.
- Mission 1 (backend): rememberMe handling inverted in the login controller — observable
  via cookie Max-Age; not covered by unit tests, must be debugged at runtime.
- Mission 2 (frontend): post-login redirect logic inverted in `login-form.tsx` —
  observable via navigation behavior; debugged in Chrome DevTools.
- Mission 3 (jest): a comparison flipped in `user-session.service.ts` making existing
  specs fail — debugged with the Jest launch config.

## Tooling changes

- Add a "Debug Jest (current file)" configuration to `.vscode/launch.json`
  (`cwd: ${fileDirname}` so Jest resolves the nearest project config).
- The compound config mentioned during brainstorming is dropped: with VSCode browser
  debugging out of scope there is no second config worth pairing with.
