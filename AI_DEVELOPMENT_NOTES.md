# AI-assisted development notes

This project was developed with assistance from AI coding agents. The goal was
not to accept generated code at face value, but to turn product requirements
into reviewable changes and protect the user's original media with explicit
quality gates.

## My role

I defined the product behavior, selected the local-first architecture, reviewed
generated changes, investigated failures, decided which proposals to keep, and
added documentation and automated checks for the highest-risk scenarios.

## Tasks delegated to agents

Agents were used to accelerate:

- exploration of browser file APIs and media metadata formats;
- implementation drafts for EXIF and ISO BMFF timestamp handling;
- UI iterations and mobile workflow experiments;
- repository restructuring and documentation;
- regression-test and verification-script drafts.

## How output was evaluated

Every change was judged against user-visible acceptance criteria:

1. photos and videos stay on the user's device;
2. no original is overwritten without confirmation;
3. filename collisions stop a move instead of replacing a file;
4. JPEG orientation remains correct;
5. EXIF dates survive closing and reopening the file;
6. undo restores the last supported operation;
7. the standalone HTML remains usable without a build environment.

## Important corrections and rejected shortcuts

- File `lastModified` is not treated as the source of truth when EXIF exists.
- JPEG files are not decoded and re-encoded just to change metadata, because
  that can reduce quality and alter orientation.
- Moving files follows check, copy, and delete phases and blocks conflicts.
- A browser undo stack is described as convenience, not as a backup system.
- The web wrapper does not receive the user's media files.
- Generated changes are not accepted if they break the single-file release.

## Automated checks

`npm run verify` performs syntax checks for inline scripts and verifies that
critical product capabilities remain present. The repository also runs lint and
build checks. GitHub Actions repeats these checks on pushes and pull requests
and scans the repository for committed secrets.

## Current limitations

The application still contains a large standalone HTML bundle. Structural
checks protect it from accidental regressions, but isolated unit testing is
harder than it would be with source modules.

## Next engineering step

Extract the media parsing, file operations, and undo logic into ES modules with
unit tests, then generate the standalone HTML during the build. The user-facing
one-file distribution should remain available.
