import type { BreadDef, DipDef, DipFamily, RotiTag } from './types';

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
