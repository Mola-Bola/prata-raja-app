// The extension contract (see docs/EXTENSIONS.md). Enable hosting with akit.json "extensions": true.
// The extension contract. An extension is a folder src/ext/<id>/ with a manifest.ts exporting `manifest`, a HomeCard.tsx,
// routes under src/app/(app)/<id>/ (so they are signed-in only), tables named public.<id>_* with RLS, and a migration
// supabase/migrations/<timestamp>_<id>.sql. src/ext/registry.ts lists them (one import line, one list line each).
import type { ComponentType } from 'react';
import type { ImageSourcePropType } from 'react-native';

/** Roles from least to most trusted. 'guest' is invite-only: a guest sees only the extensions named for them. */
export type Role = 'guest' | 'kid' | 'adult' | 'owner';
/** The roles an extension may ask for as its minimum (guests never qualify by role). */
export type MinRole = 'kid' | 'adult' | 'owner';

/** What an extension may ask the phone or the village for. Declared with a reason, checked by a lint test. */
export type Capability = 'camera' | 'microphone' | 'push' | 'location' | 'network' | 'money';
export const CAPABILITIES: readonly Capability[] = ['camera', 'microphone', 'push', 'location', 'network', 'money'];
/** One declared capability and why the extension needs it, in plain words (shown to the owner at review, max 60 chars). */
export type CapabilityUse = { name: Capability; why: string };

/** The live part of a Home tile: what an extension tells the shell about itself right now. Always passed through sanitizeLive. */
export type ExtLiveState = 'ready' | 'attention' | 'quiet' | 'down';
export type ExtLive = {
  state?: ExtLiveState;
  /** A small count or word on the tile ("2"). */
  badge?: string | number;
  /** Other people active in it now (first names). Never shown for health extensions. */
  peopleActive?: readonly string[];
  /** One line on the latest thing that happened. Never shown for health extensions. */
  lastEvent?: { line: string; at: string };
  /** Where the tile opens: one of the extension's routes, or a link out of the app. */
  door?: { kind: 'route' | 'link'; to: string };
};

/** owner: only the owner. circle: anyone in one of the owner's circles. people: only the people it was shared with. */
export type Audience = 'owner' | 'circle' | 'people';

export type ExtensionManifest = {
  /** Lower-case, unique; the route '/<id>', the table prefix '<id>_' and the feedback module. */
  id: string;
  /** The extension's own version (semver). Bump it when its screens or data shape change. */
  version: string;
  /** The oldest shell (app version, semver) this extension works with. An older shell shows "update the app". */
  minShell: string;
  /** Everything it asks of the phone or the village, each with a reason. Empty when nothing. */
  capabilities: readonly CapabilityUse[];
  /** Shown on the Home card and as the "About" line of a note. */
  name: string;
  /** Brand colour of this extension (its own look inside the shared Kampong style). */
  accent: string;
  /** A picture (require("…png")) or the name of a MaterialCommunityIcons glyph. */
  icon: ImageSourcePropType | string;
  /** The house on Home: a 3D clay picture (transparent webp, assets/village). Without one the tile borrows a plain house. */
  art?: ImageSourcePropType;
  /** How big its tile is on Home. 'wide' fills a row, 'half' shares it. Default 'half'. */
  tile?: 'wide' | 'half';
  audience: Audience;
  minRole: MinRole;
  /** 'health': nothing from it goes into notes, screenshots, logs or events, and its tile shows no people, no counts to others, no lastEvent. Read it only through isHealth(). */
  privacy: 'normal' | 'health';
  /** The card on Home. Fetches its own one-line summary. */
  HomeCard: ComponentType;
  /** Root route, '/<id>'. */
  href: string;
};

/** Who is looking at Home. */
export type Viewer = {
  role: Role;
  /** In at least one circle. */
  inCircle: boolean;
  /** Extension ids shared with this person on purpose (guests, 'people' audiences). */
  granted?: readonly string[];
};
