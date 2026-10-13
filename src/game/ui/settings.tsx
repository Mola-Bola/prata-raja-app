// The Sound and Haptics switches, shared by the pause sheet (in a run) and the stall's settings sheet. Both change the same
// two fields of the save, through the save store, so what one shows the other shows.
import type { SaveV2 } from '@/meta/types';

export type SettingKey = 'sfx' | 'haptics';

/** The save update for flipping one switch. */
export const toggleSetting = (key: SettingKey) => (save: SaveV2): SaveV2 => ({ ...save, settings: { ...save.settings, [key]: !save.settings[key] } });

export function Switch({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className="gu-switch" onClick={onClick}>
      <span>{label}</span>
      <b>{on ? 'On' : 'Off'}</b>
    </button>
  );
}
