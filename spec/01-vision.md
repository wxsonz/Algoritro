# 1. Vision

## Goal

Before writing a push_swap, you need to know **what is out there**. The algorithms are
scattered across peer repos, Medium posts and hallway talk, and they are rarely compared on
the same inputs. This explorer puts them all in one place as cards, lets you combine them
with techniques, and shows the result immediately.

**Explore first, then build.** Once you can see every known idea side by side, along with
where it spends its operations, the gaps become visible, and new ideas come from those gaps.

## Audience

- **42 peers starting push_swap** who know "Turk" and "radix" by name and want to see what
  else exists, and what each costs to learn.
- **Peers optimising** an existing build who want to know which technique to add next and
  what it is worth.
- **Evaluators and tutors** who want a visual way to explain why an algorithm spends the ops
  it does, or why a complexity claim does or does not hold.

## Questions it answers

1. What algorithms exist for push_swap, and how does each one work, step by step?
2. How hard is each one to **understand**, and how hard is it to **implement**? These are
   separate questions. Radix is easy on both. A 3-way quicksort across four ends is hard to
   understand, and once you get it the code is regular, though not short. Turk is easy to
   grasp but fiddly to build.
3. Which techniques combine with which algorithm, and what does each one save?
4. Which combinations reach the subject's grades, under 700 for n=100 and under 5500 for
   n=500, on every run and not just on average? The evaluation runs the default `--adaptive`,
   and uniform random input sits right at its 0.5 disorder cut, so the real answer is about a
   whole **build**: the medium and complex methods together.
5. Does the claimed complexity class hold when you measure it?
6. How does each one behave across disorder levels? This feeds the `--adaptive` thresholds.
7. How far is a heuristic from the true optimum, at sizes where the optimum can be computed?

## Non-goals

- Running or grading real C executables. `push_swap/visualizer/` does that.
- Giving out a finished push_swap to copy. Cards explain ideas and show behaviour. The JS is
  readable, but it is not Norm C and is not meant to be pasted.
- Server-side features or accounts. It is static files only.

## Principles

- **Honest numbers.** Every count is measured by the explorer or tagged with its source (see
  [README](README.md)). Estimates are labelled as estimates.
- **Independent validation.** Every stream is replayed by a checker that shares no code with
  the algorithms.
- **Explain, don't just show.** Every op can carry a reason. A card can be played slowly
  enough to follow.
- **Deterministic.** The same seed, cards and params always give the same stream.
- **Fun, but not in the way.** The card theme organises the material and makes it inviting.
  It never hides a number behind a mechanic.
