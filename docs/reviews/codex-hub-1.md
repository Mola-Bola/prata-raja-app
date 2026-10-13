I’ll review only the supplied diff, without running commands or reading files, and flag defects supported by the code shown.
codex
No P0/P1 defects established from the supplied diff. Two P2 findings:

1. **P2 — `src/game/ui/stall/StallHub.tsx:48` — Daily chests never enter the reveal queue.**  
   **Scenario:** Claiming a calendar chest calls `onChest`, which is wired to `onReveal`. That callback removes a UID from `pending`; it never adds the earned chest. The item reaches inventory, but cannot appear under “Open chest.”  
   **Minimal fix:** Pass a separate callback that appends the awarded item to `pending`.

2. **P2 — `src/game/ui/stall/StallHub.tsx:68–72` — Focus can escape the modal after an action disables itself.**  
   **Scenario:** A keyboard user claims today’s gift. The focused claim button becomes disabled and disappears from the trap’s button list. The next Tab is not intercepted, allowing focus onto background controls while the sheet remains open. Spending the remaining coins can trigger the same issue.  
   **Minimal fix:** Move focus to the close button when the focused action becomes disabled, and make background controls inert while the sheet is open.

Skipped commands, files, and tests as requested. Meta API internals and existing CSS were unavailable, so their behavior remains unverified.
tokens used
23,056
No P0/P1 defects established from the supplied diff. Two P2 findings:

1. **P2 — `src/game/ui/stall/StallHub.tsx:48` — Daily chests never enter the reveal queue.**  
   **Scenario:** Claiming a calendar chest calls `onChest`, which is wired to `onReveal`. That callback removes a UID from `pending`; it never adds the earned chest. The item reaches inventory, but cannot appear under “Open chest.”  
   **Minimal fix:** Pass a separate callback that appends the awarded item to `pending`.

2. **P2 — `src/game/ui/stall/StallHub.tsx:68–72` — Focus can escape the modal after an action disables itself.**  
   **Scenario:** A keyboard user claims today’s gift. The focused claim button becomes disabled and disappears from the trap’s button list. The next Tab is not intercepted, allowing focus onto background controls while the sheet remains open. Spending the remaining coins can trigger the same issue.  
   **Minimal fix:** Move focus to the close button when the focused action becomes disabled, and make background controls inert while the sheet is open.

Skipped commands, files, and tests as requested. Meta API internals and existing CSS were unavailable, so their behavior remains unverified.
