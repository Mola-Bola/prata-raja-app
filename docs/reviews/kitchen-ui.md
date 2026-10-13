# Kitchen UI

The kitchen has its own screen and event lifecycle. Entry and start clear the normal reward ticket; it never commits the save. Returning to the stall allows ordinary play again. The URL shortcut opens the kitchen without dismissing a prologue or writing progress.

Setup uses implemented content and chapter waves, including each chapter's actual boss wave. Four rotis and four dips are supported; base/evolved variants share a slot, evolved levels stop at one, supported links stop at two, and changing a roti clears stale links. Other dips apply to all rotis. Invalid/empty builds and invalid seeds cannot start. Core validation remains the final authority.

Phone layout: a scrollable setup sheet uses 70% of the game height; live controls fold away, with metrics above the visible canvas. Controls have labels, 44px tap targets, focus trapping/return, Escape closure and existing game tokens/fonts. Feedback uses TellButton. Shown damage explicitly includes overkill.

Verification pending final dependency integration: browser tests cover 320px controls and real selected builds, live knobs, repeatable seeds/boss, save invariance through win/loss/restart/quit, and a normal run afterwards. No future quality, tiers, gear or drinks are represented as working.
