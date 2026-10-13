// Prata Raja core model: the contract between content, simulation, renderer and UI.
// Pure data types only. Nothing in src/core may import Phaser, React, the DOM or Expo:
// the core runs headless (tests, balance sims) and identically on web and native.
//
// Field space: the game logic is a flat top-down lane. x runs -270 (left) .. 270 (right);
// y runs 0 (the counter, where Kannan stands) .. 1000 (the horizon, where enemies spawn).
// The renderer projects field space into the over-the-shoulder perspective (src/core/view.ts).
// Units: distances in field units (u), speeds in u/s, time in seconds, percents as fractions (0.1 = 10%).

export const FIELD = {
  halfWidth: 270,
  depth: 1000,
  /** An enemy at y <= reachY is "at the counter" and hurts Kannan. */
  reachY: 30,
  /** Kannan slides within -kannanMaxX..kannanMaxX. */
  kannanMaxX: 230,
  /** Half-width of Kannan's body for enemy projectiles that land on the counter. */
  kannanHitHalfWidth: 34,
} as const;

// ── Ids ──────────────────────────────────────────────────────────────────────

export type BreadId =
  | 'kosong' | 'tissue' | 'roti-bomb' | 'egg-telur' | 'thosai' | 'chapati'
  | 'naan' | 'garlic-naan' | 'murtabak' | 'appam' | 'idli' | 'vadai';
export type DipId =
  | 'fish-curry' | 'condensed-milk' | 'mint-chutney' | 'masala' | 'mutton-curry'
  | 'chicken-curry' | 'sambal' | 'teh-tarik' | 'ghee' | 'dhal';
export type PassiveId =
  | 'strong-wrists' | 'fast-flip' | 'extra-dough' | 'big-dough' | 'hot-tawa' | 'lucky-towel'
  | 'thick-skin' | 'kopi-break' | 'sharp-eye' | 'bigger-tips' | 'multitasker' | 'second-helping';
export type EnemyKind =
  | 'walker' | 'runner' | 'flyer' | 'swarm' | 'tank' | 'shooter' | 'splitter'
  | 'shielded' | 'healer' | 'summoner' | 'exploder';
/** Sprite keys are manifest paths without extension, e.g. 'breads/kosong' (assets/game/manifest.json). */
export type SpriteKey = string;

// ── Content definitions (src/content/*) ─────────────────────────────────────

/** How a bread travels. straight: flies at a target (pierce/hops/fragments/volley ride on it).
 *  lob: arcs to a target point and bursts (blast, optional lingering zone).
 *  wave: a wide bar rolling up the street from Kannan. boomerang: out to range, back to Kannan.
 *  orbit: a ring that circles the counter front, no cooldown. */
export type BreadMotion = 'straight' | 'lob' | 'wave' | 'boomerang' | 'orbit';
/** nearest: closest enemy by field distance. cluster: enemy with most neighbours within blast. none: fires straight up the street. */
export type BreadTarget = 'nearest' | 'cluster' | 'none';

/** Absolute stats for one bread level (L1..L5 each list every field; zero means "not used"). */
export type BreadStats = {
  dmg: number;
  cooldown: number;
  /** Projectile speed (u/s); for lob, ignored (lobTime rules). */
  speed: number;
  /** Projectile hit radius (u). */
  radius: number;
  /** Max distance from the counter it can target or travel (u). */
  range: number;
  /** Shots per throw (idli volley); 1 for most. */
  count: number;
  /** Fan spread between shots of one throw, degrees. */
  spread: number;
  /** Seconds between shots of a volley. */
  volleyGap: number;
  /** Extra enemies passed through after the first hit. */
  pierce: number;
  /** Hops to the next nearest un-hit enemy after a hit (kosong ricochet, appam bounce). */
  hops: number;
  hopRange: number;
  /** Damage multiplier lost per hop (0.15 = -15% per hop). */
  hopFalloff: number;
  /** Egg: fragments spawned on hit, each dealing fragmentDmg. */
  fragments: number;
  fragmentDmg: number;
  /** Lob: blast radius on landing (u) and flight time (s). */
  blast: number;
  lobTime: number;
  /** Lingering zone after landing (garlic naan): seconds and damage per second inside it. */
  zoneTime: number;
  zoneDps: number;
  /** Wave: bar width (u). */
  width: number;
  /** On-hit crowd control. */
  stun: number;
  knockback: number;
  /** Orbit: ring radius (u); hit cooldown per enemy per orb (s). */
  orbitRadius: number;
  orbitHitGap: number;
  /** Fraction of armour/shield ignored (tissue L5). */
  armourPierce: number;
  /** Fragments/projectiles steer toward enemies (0 = no, 1 = strong). */
  homing: number;
};

export type BreadDef = {
  id: BreadId;
  name: string;
  flavor: string;
  sprite: SpriteKey;
  motion: BreadMotion;
  target: BreadTarget;
  /** Exactly 5 entries: L1..L5. */
  levels: BreadStats[];
  /** 'starter' or the recipe id that unlocks it into the run pool (S2+). */
  unlock: 'starter' | string;
};

/** What a dip does when any bread hits. Each dip level is one HitEffect with its numbers. */
export type HitEffect =
  | { type: 'burn'; dps: number; time: number }
  | { type: 'sugar'; slowPct: number; slowTime: number; dpsPerStack: number; stackTime: number; crashAt: number; crashStun: number }
  | { type: 'chill'; slowPerStack: number; time: number; freezeAt: number; freezeTime: number }
  | { type: 'chain'; dmg: number; jumps: number; range: number }
  | { type: 'tender'; knockback: number; dmgTakenPct: number; time: number }
  | { type: 'stackDmg'; pctPerStack: number; maxStacks: number; time: number; critAtMax: number }
  | { type: 'deathBlast'; dmg: number; radius: number }
  | { type: 'haste'; everyHits: number; throwSpeedPct: number; time: number }
  | { type: 'spin'; projSpeedPct: number; critDmgPct: number; time: number }
  | { type: 'healOnKill'; hp: number };

export type DipDef = {
  id: DipId;
  name: string;
  flavor: string;
  sprite: SpriteKey;
  /** Damage-number / tint colour for this dip's effects, '#RRGGBB'. */
  color: string;
  /** Exactly 5 entries: L1..L5. */
  levels: HitEffect[];
  unlock: 'starter' | string;
};

/** Run-time player numbers. Base values in sim; passives, meta and buffs add to them. */
export type PlayerStats = {
  maxHp: number;
  regen: number;
  moveSpeed: number;
  dmgPct: number;
  throwSpeedPct: number;
  critChance: number;
  critMult: number;
  extraProjectiles: number;
  sizePct: number;
  dotPct: number;
  rangePct: number;
  xpPct: number;
  /** Fraction of throw rate kept while moving (Archero rule: 0 = stop to throw). */
  throwWhileMoving: number;
  revives: number;
  dmgTakenPct: number;
  dodge: number;
  healOnLevelUpPct: number;
  goldPct: number;
};

export type PassiveDef = {
  id: PassiveId;
  name: string;
  /** Short card text, e.g. '+6% damage'. */
  desc: string;
  maxLevel: number;
  /** Added to PlayerStats once per level. */
  perLevel: Partial<PlayerStats>;
  sprite: SpriteKey;
};

export type EnemyDef = {
  id: string;
  name: string;
  kind: EnemyKind;
  sprite: SpriteKey;
  /** Wave-1 base HP (the chapter's wave scaling multiplies it). */
  hp: number;
  speed: number;
  contactDps: number;
  xp: number;
  /** Body radius (u) for hits and spacing. */
  radius: number;
  /** Multiplier on knockback received (tank 0.25). */
  knockbackTaken?: number;
  /** Front shield HP that blocks straight/boomerang hits without pierce. */
  shield?: number;
  ranged?: { minY: number; maxY: number; cooldown: number; aimTime: number; dmg: number; projSpeed: number; projSprite: SpriteKey };
  split?: { into: string; count: number };
  heal?: { hps: number; radius: number; minY: number; maxY: number };
  summon?: { id: string; every: number; max: number };
  explode?: { fuse: number; dmg: number; radius: number };
  /** Swarm: spawns as a cloud of this many. */
  cloud?: number;
  /** Runner dash/pause rhythm (s). */
  dash?: { go: number; rest: number; boost: number };
  /** Flyer zigzag amplitude (u) and period (s). */
  zigzag?: { amp: number; period: number };
  weakTo?: string;
};

/** Boss attacks are all dodgeable by sliding left/right. tell = warning time before it lands. */
export type BossAttack =
  | { kind: 'volley'; id: string; name: string; tell: number; cooldown: number; shots: number; spread: number; dmg: number; projSpeed: number; projSprite: SpriteKey }
  | { kind: 'charge'; id: string; name: string; tell: number; cooldown: number; laneWidth: number; dmg: number; speed: number }
  | { kind: 'summon'; id: string; name: string; tell: number; cooldown: number; enemy: string; count: number }
  | { kind: 'rain'; id: string; name: string; tell: number; cooldown: number; marks: number; markWidth: number; dmg: number }
  | { kind: 'sweep'; id: string; name: string; tell: number; cooldown: number; dmg: number };

export type BossDef = EnemyDef & {
  /** HP fractions where the next phase starts, e.g. [0.5]. Each phase speeds attacks up by phaseHaste. */
  phases: number[];
  phaseHaste: number;
  /** Where the boss parks to attack (y). */
  holdY: number;
  attacks: BossAttack[];
};

export type WaveDef = {
  /** Spawn budget in threat points (see ENEMY_COST in waves.ts). */
  budget: number;
  /** Seconds over which the budget is spawned. */
  duration: number;
  /** Enemy id -> relative weight. */
  mix: Record<string, number>;
  /** Chance that a spawned enemy is elite (x3 HP, golden tint). */
  eliteChance: number;
  /** Boss id spawned at the start of this wave (the last wave). */
  boss?: string;
};

export type ChapterDef = {
  id: string;
  name: string;
  background: SpriteKey;
  /** HP multiplier per wave: hp * (1 + hpPerWave * (wave - 1)). */
  hpPerWave: number;
  waves: WaveDef[];
};

export type Content = {
  breads: Record<BreadId, BreadDef>;
  dips: Record<DipId, DipDef>;
  passives: Record<PassiveId, PassiveDef>;
  enemies: Record<string, EnemyDef>;
  bosses: Record<string, BossDef>;
  chapters: ChapterDef[];
  lines: { wake: string[]; win: string[]; tips: string[] };
};

// ── Run state (src/core/sim.ts owns mutation) ───────────────────────────────

/** 'ccImmune' is the 3 s after a freeze, stun or Sugar Crash ends in which none can land on that enemy again (status.ts). */
export type StatusId = 'burn' | 'sugar' | 'sugarSlow' | 'chill' | 'freeze' | 'stun' | 'tender' | 'ccImmune';

export type Status = {
  id: StatusId;
  /** Seconds left. */
  time: number;
  stacks: number;
  /** Damage per second (burn; sugar = per stack). */
  dps: number;
  /** Slow fraction (sugarSlow/chill per stack) or dmg-taken fraction (tender). */
  amount: number;
};

export type Enemy = {
  uid: number;
  def: EnemyDef | BossDef;
  boss: boolean;
  elite: boolean;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  shield: number;
  statuses: Status[];
  /** walk: approaching; hold: parked (shooter/healer/boss); attack: at the counter; fuse: exploder ticking. */
  state: 'walk' | 'hold' | 'attack' | 'fuse' | 'dead';
  /** Generic per-state timer (s). */
  t: number;
  /** Seconds since spawn (zigzag phase etc.). */
  age: number;
  /** Pending knockback distance (u) applied over a few frames. */
  knock: number;
  /** Seconds of white hit-flash left (renderer reads it). */
  flash: number;
  /** Boss/shooter attack bookkeeping. */
  cooldowns: Record<string, number>;
  phase: number;
  /** Where a holder parks. */
  holdY: number;
};

export type Projectile = {
  uid: number;
  owner: 'player' | 'enemy';
  sprite: SpriteKey;
  breadId?: BreadId;
  motion: BreadMotion | 'enemy';
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Lob height 0..1 for the renderer's arc; also the boomerang return flag via `returning`. */
  z: number;
  /** Seconds alive / seconds to live. */
  t: number;
  ttl: number;
  dmg: number;
  radius: number;
  pierceLeft: number;
  hopsLeft: number;
  /** uids already hit (no double hits, except orbit by hitGap). */
  hit: number[];
  returning: boolean;
  targetUid: number | null;
  /** Lob landing point. */
  tx: number;
  ty: number;
  /** Bread level stats snapshot at throw time (null for enemy shots). */
  stats: BreadStats | null;
  /** Spin angle for the renderer (radians). */
  spin: number;
};

export type Zone = { uid: number; x: number; y: number; radius: number; dps: number; time: number; sprite: SpriteKey };

export type OwnedBread = { id: BreadId; level: number; cd: number; volleyLeft: number; volleyT: number };
export type OwnedDip = { id: DipId; level: number };
export type OwnedPassive = { id: PassiveId; level: number };

/** Self-buffs from dips (haste, spin, stackDmg). */
export type Buff = { id: 'haste' | 'spin' | 'stackDmg'; time: number; stacks: number; hitCount: number };

export type Player = {
  x: number;
  targetX: number;
  moving: boolean;
  hp: number;
  stats: PlayerStats;
  breads: OwnedBread[];
  dips: OwnedDip[];
  passives: OwnedPassive[];
  buffs: Buff[];
  level: number;
  xp: number;
  xpToNext: number;
  revivesLeft: number;
  /** Seconds of throw-animation left (renderer pose). */
  throwAnim: number;
  hurtAnim: number;
};

export type Card = {
  kind: 'bread' | 'dip' | 'passive' | 'heal' | 'gold';
  /** BreadId / DipId / PassiveId; '' for heal/gold. */
  id: string;
  /** The level the item becomes if picked (1 = new). */
  level: number;
};

export type GameEvent =
  | { t: 'throw'; breadId: BreadId; x: number }
  | { t: 'hit'; uid: number; x: number; y: number; dmg: number; crit: boolean; color: string | null }
  | { t: 'dot'; uid: number; x: number; y: number; dmg: number; color: string }
  | { t: 'shieldHit'; uid: number; x: number; y: number }
  | { t: 'shieldBreak'; uid: number; x: number; y: number }
  | { t: 'kill'; uid: number; x: number; y: number; enemyId: string; xp: number; boss: boolean; elite: boolean }
  | { t: 'blast'; x: number; y: number; radius: number; color: string | null }
  | { t: 'chain'; points: { x: number; y: number }[] }
  | { t: 'status'; uid: number; status: StatusId }
  | { t: 'aim'; uid: number; x: number; y: number; tx: number; time: number }
  | { t: 'enemyShot'; uid: number }
  | { t: 'splat'; x: number }
  | { t: 'playerHit'; dmg: number; source: 'contact' | 'shot' | 'boss' | 'explode' }
  | { t: 'dodge' }
  | { t: 'heal'; hp: number }
  | { t: 'xp'; amount: number; x: number; y: number }
  | { t: 'levelUp'; level: number }
  | { t: 'waveStart'; wave: number; total: number }
  | { t: 'bossSpawn'; bossId: string; name: string }
  | { t: 'bossTell'; attackId: string; name: string; kind: BossAttack['kind']; xs: number[]; width: number; time: number }
  | { t: 'bossPhase'; phase: number }
  | { t: 'revive' }
  | { t: 'runEnd'; won: boolean };

export type RunPhase = 'intro' | 'wave' | 'levelup' | 'won' | 'lost';

export type RunResult = {
  won: boolean;
  wave: number;
  kills: number;
  bossKills: number;
  time: number;
  level: number;
  gold: number;
  breads: OwnedBread[];
  dips: OwnedDip[];
};

/** Permanent bonuses from the stall (gear, training) applied at run start. S1 passes {}. */
export type Loadout = { stats?: Partial<PlayerStats>; startBread?: BreadId; /** Level-up rerolls per run (default 1). */ rerolls?: number };

export type World = {
  /** Field x of the wave director's last spawn (keeps spawn spacing replayable). */
  lastSpawnX?: number;
  seed: number;
  /** RNG state lives here so a world can be saved and replayed. */
  rngState: number;
  content: Content;
  chapter: ChapterDef;
  time: number;
  phase: RunPhase;
  /** 1-based wave number; 0 before the first wave. */
  wave: number;
  waveTime: number;
  /** Threat points left to spawn this wave and seconds since its last spawn. */
  budgetLeft: number;
  spawnClock: number;
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
  zones: Zone[];
  nextUid: number;
  kills: number;
  bossKills: number;
  gold: number;
  /** Level-ups waiting for a card pick. */
  pendingLevelUps: number;
  offer: Card[];
  /** Last two displayed offers, including rerolls (older worlds can omit it). */
  recentOffers?: Card[][];
  rerolls: number;
  /** Events produced since the renderer last drained them. */
  events: GameEvent[];
  result: RunResult | null;
  // Sim-owned extras (optional, so older worlds still load). Set by createRun.
  /** The run's loadout, kept so chooseCard can recompute stats (cards.applyCard needs it). */
  loadout?: Loadout;
  /** Contact damage taken and seconds since the last aggregated 'playerHit' (contact) event. */
  contactAcc?: number;
  contactT?: number;
};

/** What the renderer sends each frame. targetX: field x under the finger while dragging, else null. */
export type RunInput = { targetX: number | null; moving: boolean };
