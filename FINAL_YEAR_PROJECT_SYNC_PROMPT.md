# FINAL YEAR PROJECT SYNC INSTRUCTIONS & MASTER PROMPT

This document provides the exact, self-contained prompt to use whenever you want an AI assistant (in a brand new chat with zero previous context) to synchronize all new development from your **Hackathon Project (`DepRadar`)** back to your **Final Year College Project (`VibePulse`)**.

---

## How to Use

1. Do your development / hackathon work inside this repository.
2. When you want to sync all recent work to your Final Year Project repository, open a new chat with your AI assistant.
3. **Copy and paste the entire block inside the "MASTER PROMPT" section below** directly into the chat prompt.
4. The AI will follow the strict step-by-step procedure to preserve your commit history, verify authorship, validate tests/CI, and push cleanly without destructive overrides.

---

# ============================================================

# MASTER PROMPT (COPY EVERYTHING BELOW THIS LINE)

# ============================================================

```text
You are assisting me with synchronizing development work from my Hackathon project back to my Final Year College Project.

============================================================
CRITICAL CONTEXT & REPOSITORIES
============================================================
1. CURRENT WORKSPACE (Hackathon Project):
   - Path: c:\Users\ASUS\OneDrive\Desktop\DepRadar
   - Remote URL: https://github.com/sanket200511/Vortex-DepRadar.git
   - Primary Branch: main
   - Branding in this folder: DepRadar

2. FINAL YEAR COLLEGE PROJECT (Target Repository):
   - Remote URL: https://github.com/sanket200511/VibePulse.git
   - Primary Branch: master
   - Remote Alias to use: vibepulse

3. PROJECT OWNER & COMMIT AUTHOR (MANDATORY):
   - Name: Sanket Kurve
   - Email: sanketkurve.2005@gmail.com
   - GitHub Username: sanket200511
   - RULE: THIS PROJECT IS SOLELY MAINTAINED BY ME.
     EVERY commit, author, and committer in the history being synced MUST belong strictly to "Sanket Kurve <sanketkurve.2005@gmail.com>".
     NO third-party names or other contributor names should ever appear.

4. ABSOLUTE RULE — DO NOT FORCE PUSH OR WIPE COMMIT HISTORY:
   - This is my college Final Year Project. My academic evaluation depends on the continuity of all past commit history.
   - DO NOT run destructive `git push --force` or overwrite branches in a way that erases previous commits on https://github.com/sanket200511/VibePulse.git.
   - Note: Because `.git` was previously initialized anew for the hackathon repo, the local `main` branch and `vibepulse/master` may have differing root commits. You MUST preserve the history continuity of `vibepulse/master` by integrating the new commits cleanly (via rebase, cherry-pick range, or merge with --allow-unrelated-histories if appropriate, ensuring history is preserved).

============================================================
YOUR STEP-BY-STEP MISSION
============================================================

Please perform the following workflow carefully and autonomously:

STEP 1: INSPECT LOCAL ENVIRONMENT & GIT STATUS
- Run `git status` in the repository to make sure the working tree is clean or identify uncommitted changes.
- Verify `git config user.name` is "Sanket Kurve" and `git config user.email` is "sanketkurve.2005@gmail.com". If not set locally, configure them with `git config user.name "Sanket Kurve"` and `git config user.email "sanketkurve.2005@gmail.com"`.

STEP 2: CHECK AUTHORSHIP OF RECENT COMMITS
- Inspect recent commits with:
  `git log -n 10 --pretty=fuller`
- If ANY commit has an author or committer other than "Sanket Kurve <sanketkurve.2005@gmail.com>", amend or rewrite that commit author using `git commit --amend --author="Sanket Kurve <sanketkurve.2005@gmail.com>"` or interactive rebase before pushing.

STEP 3: CONFIGURE VIBEPULSE REMOTE & FETCH
- Check if remote `vibepulse` exists:
  `git remote -v`
- If `vibepulse` does not exist, add it:
  `git remote add vibepulse https://github.com/sanket200511/VibePulse.git`
- Fetch the latest refs from both remotes:
  `git fetch origin`
  `git fetch vibepulse`
- Inspect `vibepulse/master`:
  `git log -n 5 --oneline vibepulse/master`

STEP 4: SAFELY INTEGRATE HACKATHON WORK ONTO FINAL YEAR PROJECT
- Create or check out a tracking branch for the final year project:
  `git checkout -B sync-final-year vibepulse/master`
- Bring over the latest changes/commits from `main` (from DepRadar) onto this branch while keeping `vibepulse/master`'s historical commits as the root.
- Ensure all commit messages are descriptive and attributed to Sanket Kurve.

STEP 5: RUN QUALITY CHECKS & TESTS (DO NOT PUSH BROKEN CODE)
- Run format and lint checks:
  `pnpm format:check`
  `pnpm --filter=!@depradar/api lint`
- Run typecheck:
  `pnpm --filter=!@depradar/api typecheck`
- Run unit/integration tests:
  `pnpm --filter=!@depradar/api test`
- If any test hangs or times out in jsdom/Vitest, use `--pool=forks` or `--no-threads`.
- Ensure `.github/workflows/ci.yml` is clean (including Python db migration steps if running backend tests, and excluding `@depradar/api` from JS turbo lint if `uv` is not present in Node runners).

STEP 6: PUSH SAFELY TO FINAL YEAR REPO
- Fast-forward or push the verified branch to `vibepulse`:
  `git push vibepulse sync-final-year:master`
- Verify that `https://github.com/sanket200511/VibePulse.git` updated cleanly and all previous commit history remains intact.

STEP 7: RETURN TO HACKATHON REPO STATE
- Switch back to `main`:
  `git checkout main`
- Ensure working tree is clean and `origin/main` is up to date:
  `git status`

STEP 8: FINAL SUMMARY REPORT
- Provide a summary table showing:
  - Commits synced
  - Test and lint verification results
  - Remote push confirmation for both repos
```

# ============================================================

# END OF MASTER PROMPT

# ============================================================
