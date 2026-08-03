# Gym Tracker — Product Vision

## Purpose

Help people **train consistently and improve over time** by making progress visible and gently pushing them forward — without guilt, noise, or complicated programming.

The app is for anyone who goes to the gym (machines, free weights, or bodyweight) and wants a simple loop:

1. **Create / pick exercises**
2. **Log sets, reps, and weight**
3. **See growth over time** (motivation)
4. **Get occasional nudges** to increase effort a little when the data says they’re ready
5. **Swap exercises** that they dislike for others that hit the **same muscle group**

---

## Core functions

### 1. Exercise library (create & choose)

- Browse a built-in list of common exercises grouped by muscle.
- Add custom exercises (e.g. a machine only their gym has).
- Each exercise is tied to a **primary muscle group** so alternatives stay useful.

### 2. Log sets & reps (the daily habit)

- Start a workout session.
- Add exercises, then log **sets × reps × weight (kg)**.
- Mark sets complete so only real work counts toward progress.
- Finish the session → it is saved permanently on the device.

This history is the foundation for everything motivational below.

### 3. Growth over time (motivation)

For each exercise the user has trained, the app shows:

- How many times they’ve done it
- Recent vs earlier best weight / volume
- A simple session-by-session trail so improvement is obvious

Seeing “I moved more weight / did more reps than three months ago” is the main motivator.

### 4. Progressive suggestions (strive for more)

**Rule (v1):** If the user has logged the **same exercise about 10 times within a 3‑month window**, the app may suggest a **small** step up, for example:

- +1–2 reps on working sets, or
- +1 set, or
- a modest weight increase (e.g. +2.5 kg)

Suggestions are **occasional**, not every session. They appear when the data supports readiness, and the user can dismiss them. The goal is encouragement, not pressure.

### 5. Same-muscle alternatives (“I don’t like this machine”)

If a user dislikes a machine or exercise, they can ask for **other exercises that hit the same core muscle group** (e.g. swap Leg Press → Squats / Lunges / Hack Squat–style options from the library).

This keeps training flexible when equipment is busy, uncomfortable, or boring.

---

## Design principles

| Principle | Meaning |
|-----------|---------|
| Simple logging | Fast to enter sets between rest periods |
| Progress first | Growth is visible without spreadsheets |
| Gentle progression | Small bumps after proven consistency |
| Flexible library | Custom exercises + muscle-based swaps |
| Local-first | Data lives on the phone (no account required for core use) |

---

## Success looks like

- User can recreate last week’s session in under a minute.
- User can open an exercise and immediately see whether they got stronger.
- After roughly 10 hard sessions of one lift in ~3 months, they get a clear, small “try a bit more” tip.
- If they hate an exercise, alternatives for the same muscle are one tap away.

---

## Out of scope (for now)

- Full AI coaching / meal plans
- Social feeds
- Mandatory accounts
- Strict periodization programs

These can come later; the core loop above is the product.
