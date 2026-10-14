import type { BreadDef, Content, DipDef, DipFamily, HitEffect, OwnedDip, RotiTag } from './types';

export const MAX_LINKED_DIPS = 2;
export const DIP_FAMILIES: Record<DipFamily, { name: string; flavour: string }> = {
  chutney: { name: 'Chutneys', flavour: 'Tang' }, curry: { name: 'Curries', flavour: 'Spice' },
  dhal: { name: 'Dhal', flavour: 'Comfort' }, sambar: { name: 'Sambar', flavour: 'Richness' },
  special: { name: 'Specials', flavour: 'Mixed' },
};
export const tagLabel = (tag: RotiTag): string => tag[0].toUpperCase() + tag.slice(1);
export const tagLabels = (tags: readonly RotiTag[]): string => tags.map(tagLabel).join(' · ');
export const dipFamilyLabel = (dip: DipDef): string => `${DIP_FAMILIES[dip.family].name} · ${DIP_FAMILIES[dip.family].flavour}`;
export const isLinkableDip = (dip: DipDef): boolean => !!dip.matchingTags?.length;
export const dipMatchesBread = (dip: DipDef, bread: BreadDef): boolean =>
  !!dip.matchingTags?.some(tag => bread.tags.includes(tag));
export const dipBonusLabel = (dip: DipDef, bread?: BreadDef): string =>
  !bread ? 'Global effect' : dipMatchesBread(dip, bread) ? '+25% tag bonus' : 'No tag bonus';

/** Owned-level effect with the matching link's tag bonus; hit filtering and simmer remain with the caller. */
export function linkedDipEffect(content: Content, dip: OwnedDip): HitEffect {
  const def = content.dips[dip.id], base = def.levels[dip.level - 1];
  if (!dip.linkedBread || !dipMatchesBread(def, content.breads[dip.linkedBread])) return base;
  switch (base.type) {
    case 'burn': return { ...base, dps: base.dps * 1.25, time: base.time * 1.25 };
    case 'sugar': return { ...base, slowTime: base.slowTime * 1.25, crashStun: base.crashStun * 1.25 };
    case 'chill': return { ...base, time: base.time * 1.25, freezeTime: base.freezeTime * 1.25 };
    default: return base;
  }
}
