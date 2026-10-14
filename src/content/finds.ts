// Street-find theme copy (src/core/finds.ts picks the card; this only dresses it). Keyed by card id (passive, bread or dip).
// Edit freely: a missing id falls back to "A regular's <item name>". Giver + item read as "Auntie's spare ghee".
export type FindCopy = { giver: string; item: string; flavour: string };

export const FINDS: Record<string, FindCopy> = {
  // passives
  'strong-wrists': { giver: 'Uncle Ah Seng', item: 'wrist tape', flavour: '"Tape up, boy. Long night."' },
  'fast-flip': { giver: "Auntie", item: 'spare ghee', flavour: '"For the tawa, not for you."' },
  'extra-dough': { giver: 'The baker', item: 'extra dough ball', flavour: '"Still warm."' },
  'big-dough': { giver: 'Mak Cik Rose', item: 'rolling pin', flavour: '"Roll it wide."' },
  'hot-tawa': { giver: 'The satay man', item: 'hot coals', flavour: '"Keep the tawa angry."' },
  'lucky-towel': { giver: 'Grandpa', item: 'lucky towel', flavour: '"Wiped many a lucky pan."' },
  'thick-skin': { giver: 'The kopi aunty', item: 'padded apron', flavour: '"Hot oil, meet cotton."' },
  'kopi-break': { giver: 'The kopi aunty', item: 'kopi-o', flavour: '"Kaw, no sugar. Sit a second."' },
  'sharp-eye': { giver: 'Ah Boy', item: 'old binoculars', flavour: '"See them coming."' },
  'bigger-tips': { giver: 'A happy customer', item: 'tip jar', flavour: '"Keep the change."' },
  'crisp-edges': { giver: 'Chef Lim', item: 'extra-hot tawa', flavour: '"Crisp is a mood."' },
  'curry-soak': { giver: 'Mamak Ali', item: 'curry bucket', flavour: '"Dunk everything."' },
  'crackling-curry': { giver: 'Mamak Ali', item: 'sizzling ladle', flavour: '"Listen to it crackle."' },
  // breads
  kosong: { giver: 'Old Mr Tan', item: 'kosong dough', flavour: '"Plain is not simple."' },
  tissue: { giver: 'The cleaner', item: 'tissue roll', flavour: '"Thin as paper."' },
  'roti-bomb': { giver: 'Little Meena', item: 'bomb dough', flavour: '"Stand back!"' },
  'egg-telur': { giver: 'The egg uncle', item: 'tray of eggs', flavour: '"Crack carefully."' },
  thosai: { giver: 'Aunty Devi', item: 'thosai batter', flavour: '"Fermented overnight."' },
  chapati: { giver: 'Aunty Devi', item: 'chapati stack', flavour: '"Boomerang, hor."' },
  naan: { giver: 'The tandoor man', item: 'naan blank', flavour: '"Heavy, but worth it."' },
  'garlic-naan': { giver: 'The tandoor man', item: 'garlic butter', flavour: '"Smell that?"' },
  murtabak: { giver: 'Mamak Ali', item: 'murtabak mince', flavour: '"Stuffed to the edges."' },
  appam: { giver: 'Paati', item: 'appam pan', flavour: '"Bouncy, like my knees."' },
  idli: { giver: 'Paati', item: 'idli steamer', flavour: '"Hot and fluffy."' },
  vadai: { giver: 'The temple lady', item: 'vadai bag', flavour: '"Round and round."' },
  // dips
  'fish-curry': { giver: 'The fishmonger', item: 'fish curry pot', flavour: '"Slow burn."' },
  'condensed-milk': { giver: 'The kopi aunty', item: 'milk tin', flavour: '"Sweet and sticky."' },
  'mint-chutney': { giver: 'The herb seller', item: 'mint bunch', flavour: '"Cool as a breeze."' },
  masala: { giver: 'The spice man', item: 'masala pouch', flavour: '"Do not sniff."' },
  'mutton-curry': { giver: 'Mamak Ali', item: 'mutton curry', flavour: '"Hearty."' },
  'chicken-curry': { giver: 'Mamak Ali', item: 'chicken curry', flavour: '"Builds up."' },
  sambal: { giver: 'The nasi lemak lady', item: 'sambal jar', flavour: '"Please keep away from fire."' },
  'teh-tarik': { giver: 'The teh man', item: 'pulled tea', flavour: '"Pulled just now."' },
  ghee: { giver: 'Auntie', item: 'golden ghee', flavour: '"Liquid gold."' },
  dhal: { giver: 'Paati', item: 'dhal pot', flavour: '"Good for the soul."' },
};
