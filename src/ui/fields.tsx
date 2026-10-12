import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { HelperText, IconButton, SegmentedButtons, Switch, Text, TextInput, TouchableRipple } from 'react-native-paper';
import { DatePickerModal, enGB, registerTranslation } from 'react-native-paper-dates';

import { fmtDate, parseAmount, parseTypedDate } from '../domain/format';
import { Sheet } from './chrome';
import { numberFieldAgrees, showNumber, showStepper, stepperAgrees } from './followText';
import { haptic } from './haptics';
import { radius, space } from './theme';
import { useAppTheme } from './useAppTheme';
import { useFollowedText } from './useFollowedText';

type Base = { label: string; helper?: string; error?: string | null; testID?: string; disabled?: boolean };

// Dates are typed and shown day first (DD/MM/YYYY, "17 Oct"), the way people in Australia and Asia write them.
const DATE_LOCALE = 'en-GB';
registerTranslation(DATE_LOCALE, {
  ...enGB,
  mustBeHigherThan: (date) => `Pick ${date} or later`,
  mustBeLowerThan: (date) => `Pick ${date} or earlier`,
  mustBeBetween: (start, end) => `Pick a date from ${start} to ${end}`,
});

export function TextField({ value, onChange, multiline, placeholder, autoFocus, keyboardType, autoCapitalize, secure, ...b }: Base & {
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  keyboardType?: 'default' | 'email-address' | 'url' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  secure?: boolean;
}) {
  return (
    <View>
      <TextInput
        mode="outlined"
        label={b.label}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        numberOfLines={multiline ? 3 : undefined}
        placeholder={placeholder}
        autoFocus={autoFocus}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secure}
        error={!!b.error}
        disabled={b.disabled}
        // Paper's floating label isn't tied to the input on web, so name it for screen readers.
        accessibilityLabel={b.label}
        testID={b.testID}
      />
      {b.error || b.helper ? <HelperText style={styles.help} type={b.error ? 'error' : 'info'}>{b.error || b.helper}</HelperText> : null}
    </View>
  );
}

/** Number input that accepts "12,50", "1,299" etc. Emits null when blank or not a number. */
export function NumberField({ value, onChange, suffix, prefix, integer, autoFocus, onSubmit, ...b }: Base & {
  value: number | null;
  onChange: (v: number | null) => void;
  suffix?: string;
  prefix?: string;
  integer?: boolean;
  autoFocus?: boolean;
  /** The keyboard's Done key (e.g. save a price in one go). */
  onSubmit?: () => void;
}) {
  // Shows what was typed, and follows the value when something else changes it (a prefill, a lookup, a voice fill).
  const box = useFollowedText(value, numberFieldAgrees(integer), showNumber);
  const { text } = box;
  // Worked out from what is shown, so it can never disagree with it.
  const parsedText = parseAmount(text);
  const invalid = parsedText === 'invalid' || (!!integer && parsedText != null && !Number.isInteger(parsedText));
  return (
    <View style={{ flex: 1 }}>
      <TextInput
        key={box.fresh}
        mode="outlined"
        label={b.label}
        value={text}
        keyboardType={integer ? 'number-pad' : 'decimal-pad'}
        autoFocus={autoFocus}
        returnKeyType={onSubmit ? 'done' : undefined}
        onSubmitEditing={onSubmit}
        onChangeText={(t) => {
          box.type(t);
          const p = parseAmount(t);
          // Don't leave the last good number behind: "15a" must not quietly save as 15.
          if (p === 'invalid' || (integer && p != null && !Number.isInteger(p))) return onChange(null);
          onChange(p);
        }}
        left={prefix ? <TextInput.Affix text={prefix} /> : undefined}
        right={suffix ? <TextInput.Affix text={suffix} /> : undefined}
        error={invalid || !!b.error}
        disabled={b.disabled}
        accessibilityLabel={b.label}
        testID={b.testID}
      />
      {invalid || b.error || b.helper ? (
        <HelperText style={styles.help} type={invalid || b.error ? 'error' : 'info'}>{invalid ? 'Numbers only, e.g. 12.50' : b.error || b.helper}</HelperText>
      ) : null}
    </View>
  );
}

/** Non-interactive trailing icon for read-only fields (a real button inside the tap target is invalid HTML on web). */
function FieldIcon({ name }: { name: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }) {
  const theme = useAppTheme();
  return (
    <View pointerEvents="none" style={styles.fieldIcon}>
      <MaterialCommunityIcons name={name} size={22} color={theme.colors.onSurfaceVariant} />
    </View>
  );
}

/** Read-only field that opens a picker when tapped. */
function TapField({ label, value, icon, onPress, error, disabled, testID, a11y }: { label: string; value: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; onPress: () => void; error?: boolean; disabled?: boolean; testID?: string; a11y: string }) {
  return (
    <Pressable onPress={() => !disabled && onPress()} testID={testID} accessibilityRole="button" accessibilityLabel={a11y} disabled={disabled}>
      {/* Only the button is announced and focusable; the read-only input inside is just its look. */}
      <View pointerEvents="none" aria-hidden importantForAccessibility="no-hide-descendants">
        <TextInput mode="outlined" label={label} value={value} editable={false} error={error} disabled={disabled} tabIndex={-1} style={{ paddingRight: 36 }} />
        <FieldIcon name={icon} />
      </View>
    </Pressable>
  );
}

/**
 * Dropdown picker (works on Android, iOS, web). The options open in a sheet that scrolls, so every one can be
 * reached on any screen: an anchored menu of 15 countries ran off the bottom of a phone and couldn't scroll.
 */
export function SelectField<T extends string>({ value, options, onChange, ...b }: Base & {
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  // Mount the sheet on first open only: a form can have several of these.
  const [armed, setArmed] = useState(false);
  if (open && !armed) setArmed(true);
  const current = options.find((o) => o.value === value);
  return (
    <View style={{ flex: 1 }}>
      <TapField
        label={b.label}
        value={current?.label ?? ''}
        icon="menu-down"
        onPress={() => setOpen(true)}
        error={!!b.error}
        disabled={b.disabled}
        testID={b.testID}
        a11y={`${b.label}: ${current?.label ?? 'not set'}`}
      />
      {b.error || b.helper ? <HelperText style={styles.help} type={b.error ? 'error' : 'info'}>{b.error || b.helper}</HelperText> : null}
      {armed ? (
        <Sheet visible={open} onDismiss={() => setOpen(false)} title={b.label} testID={b.testID ? `${b.testID}-sheet` : undefined}>
          <OptionList
            label={b.label}
            options={options}
            value={value}
            onPick={(v) => {
              setOpen(false);
              onChange(v);
            }}
            testID={b.testID ?? 'select'}
          />
        </Sheet>
      ) : null}
    </View>
  );
}

/** Pick-one list inside a SelectField's sheet: full-width rows, the current one ticked. */
function OptionList<T extends string>({ label, options, value, onPick, testID }: { label: string; options: { value: T; label: string }[]; value: T | null; onPick: (v: T) => void; testID: string }) {
  const theme = useAppTheme();
  return (
    <View role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <TouchableRipple
            key={o.value}
            onPress={() => onPick(o.value)}
            role="radio"
            aria-checked={on}
            accessibilityState={{ checked: on }}
            accessibilityLabel={o.label}
            testID={`${testID}-${o.value}`}
            style={[styles.option, on && { backgroundColor: theme.colors.secondaryContainer }]}>
            <View style={styles.optionRow}>
              <Text variant="bodyLarge" style={{ flex: 1, color: on ? theme.colors.onSecondaryContainer : theme.colors.onSurface }}>
                {o.label}
              </Text>
              {on ? <MaterialCommunityIcons name="check" size={22} color={theme.colors.onSecondaryContainer} /> : null}
            </View>
          </TouchableRipple>
        );
      })}
    </View>
  );
}

/** Date picker (Material). Value is YYYY-MM-DD or null. `min` / `max` grey out the days outside that range; `warn` is a note that doesn't block. */
export function DateField({ value, onChange, clearable, min, max, warn, ...b }: Base & {
  value: string | null;
  onChange: (v: string | null) => void;
  clearable?: boolean;
  min?: string | null;
  max?: string | null;
  warn?: string | null;
}) {
  const theme = useAppTheme();
  const [open, setOpen] = useState(false);
  // Web: the picker's "type it" box only passes on a whole date in range; anything else it silently drops, and Save
  // then kept the old date without a word. So Save waits until what's typed is a whole date it will take.
  const [typedBad, setTypedBad] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'web' || !open || typeof document === 'undefined') return;
    const onInput = (e: Event) => {
      if (!(e.target instanceof HTMLInputElement)) return;
      const iso = parseTypedDate(e.target.value);
      setTypedBad(!iso || (!!min && iso < min) || (!!max && iso > max));
    };
    document.addEventListener('input', onInput, true);
    return () => document.removeEventListener('input', onInput, true);
  }, [open, min, max]);
  const toDate = (s: string | null | undefined) => {
    if (!s) return undefined;
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return (
    <View style={{ flex: 1 }}>
      <TapField
        label={b.label}
        value={value ? fmtDate(value) : ''}
        icon="calendar"
        onPress={() => {
          setTypedBad(false);
          setOpen(true);
        }}
        error={!!b.error}
        disabled={b.disabled}
        testID={b.testID}
        a11y={`${b.label}: ${value ? fmtDate(value) : 'not set'}`}
      />
      {clearable && value ? (
        <Pressable onPress={() => onChange(null)} role="button" accessibilityLabel={`Clear ${b.label}`} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 4 }} testID={b.testID ? `${b.testID}-clear` : undefined}>
          <Text variant="labelMedium" style={{ textDecorationLine: 'underline' }}>
            Clear
          </Text>
        </Pressable>
      ) : null}
      {b.error || warn || b.helper ? (
        <HelperText
          type={b.error ? 'error' : 'info'}
          style={[styles.help, !b.error && warn ? { color: theme.colors.warn } : null]}
          testID={b.testID ? `${b.testID}-note` : undefined}>
          {b.error || warn || b.helper}
        </HelperText>
      ) : null}
      <DatePickerModal
        locale={DATE_LOCALE}
        mode="single"
        visible={open}
        date={toDate(value)}
        validRange={min || max ? { startDate: toDate(min), endDate: toDate(max) } : undefined}
        startWeekOnMonday
        saveLabelDisabled={typedBad}
        // A day picked on the calendar, or a whole valid date typed.
        onChange={() => setTypedBad(false)}
        onDismiss={() => setOpen(false)}
        onConfirm={({ date }) => {
          setOpen(false);
          if (date) onChange(toIso(date));
        }}
      />
    </View>
  );
}

/**
 * − value + stepper, e.g. quantity or kg. With `unit`, the number can be typed too (8 kg is one tap, not sixteen).
 */
export function Stepper({ value, onChange, step = 1, min = 0, max, format = String, label, unit, large, testID }: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  format?: (v: number) => string;
  label?: string;
  /** Shown after a typeable number, e.g. "kg". */
  unit?: string;
  /** Big − and + (48dp, 8dp apart) and a small buzz on each press: for steppers the whole screen is about. */
  large?: boolean;
  testID?: string;
}) {
  const theme = useAppTheme();
  const clamp = (v: number) => Math.round(Math.min(max ?? Infinity, Math.max(min, v)) * 100) / 100;
  return (
    <View style={[styles.stepper, large && styles.stepperLarge]} testID={testID}>
      {label ? (
        <Text variant="bodyLarge" style={{ flex: 1 }}>
          {label}
        </Text>
      ) : null}
      <IconButton icon="minus" mode={large ? 'contained-tonal' : 'outlined'} size={large ? 24 : 18} style={large ? styles.stepperButton : undefined} onPress={() => {
        if (large) haptic('tap');
        onChange(clamp(value - step));
      }} disabled={value <= min} accessibilityLabel={`Decrease ${label ?? ''}`} testID={testID ? `${testID}-minus` : undefined} />
      {unit ? (
        <StepperInput value={value} unit={unit} label={label} onChange={(v) => onChange(clamp(v))} clamp={clamp} testID={testID ? `${testID}-input` : undefined} />
      ) : (
        <Text variant="titleMedium" style={{ minWidth: 56, textAlign: 'center', fontVariant: ['tabular-nums'], color: theme.colors.onSurface }}>
          {format(value)}
        </Text>
      )}
      <IconButton icon="plus" mode={large ? 'contained-tonal' : 'outlined'} size={large ? 24 : 18} style={large ? styles.stepperButton : undefined} onPress={() => {
        if (large) haptic('tap');
        onChange(clamp(value + step));
      }} disabled={max != null && value >= max} accessibilityLabel={`Increase ${label ?? ''}`} testID={testID ? `${testID}-plus` : undefined} />
    </View>
  );
}

/** The typeable middle of a Stepper. Shows what was typed and follows the value when anything else changes it (the −
 *  and + buttons, a voice fill): see followText.ts. The unit sits beside the box, not inside it: inside, it took the
 *  room of the number ("12.5" showed as "12."). */
function StepperInput({ value, unit, label, onChange, clamp, testID }: { value: number; unit: string; label?: string; onChange: (v: number) => void; clamp: (v: number) => number; testID?: string }) {
  const theme = useAppTheme();
  const box = useFollowedText(value, stepperAgrees(clamp), showStepper);
  return (
    <View style={styles.stepperValue}>
      <TextInput
        key={box.fresh}
        mode="outlined"
        dense
        value={box.text}
        keyboardType="decimal-pad"
        selectTextOnFocus
        onChangeText={(t) => {
          box.type(t);
          const n = parseAmount(t);
          if (typeof n === 'number') onChange(n);
          else if (n === null) onChange(0);
        }}
        onBlur={box.settle}
        style={styles.stepperInput}
        contentStyle={styles.stepperText}
        accessibilityLabel={label ? `${label}, in ${unit}` : unit}
        testID={testID}
      />
      <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }} aria-hidden>
        {unit}
      </Text>
    </View>
  );
}

export function ToggleRow({ label, description, value, onChange, testID }: { label: string; description?: string; value: boolean; onChange: (v: boolean) => void; testID?: string }) {
  const theme = useAppTheme();
  return (
    <TouchableRipple onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }} aria-checked={value} accessibilityLabel={label} accessibilityHint={description} testID={testID}>
      <View style={styles.toggle}>
        <View style={{ flex: 1 }}>
          <Text variant="bodyLarge">{label}</Text>
          {description ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {description}
            </Text>
          ) : null}
        </View>
        {/* The whole row is the switch; the inner one is just its look (a switch inside a switch confuses screen readers). */}
        <View pointerEvents="none" aria-hidden importantForAccessibility="no-hide-descendants">
          <Switch value={value} tabIndex={-1} />
        </View>
      </View>
    </TouchableRipple>
  );
}

export function Segmented<T extends string>({ value, onChange, options, testID }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; icon?: string }[]; testID?: string }) {
  return (
    <SegmentedButtons
      value={value}
      onValueChange={(v) => onChange(v as T)}
      buttons={options.map((o) => ({ value: o.value, label: o.label, icon: o.icon, testID: testID ? `${testID}-${o.value}` : undefined }))}
    />
  );
}

export const FieldRow = ({ children }: { children: React.ReactNode }) => <View style={styles.fieldRow}>{children}</View>;

const styles = StyleSheet.create({
  // Paper's help text under a field is 12px; the family reads 14px.
  help: { fontSize: 14, lineHeight: 20 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  stepperLarge: { gap: space.sm },
  stepperButton: { width: 48, height: 48, margin: 0 },
  stepperValue: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  // Room for "1234.5" at any text size: narrow side padding instead of Paper's 16.
  stepperInput: { width: 72 },
  stepperText: { textAlign: 'center', fontVariant: ['tabular-nums'], paddingHorizontal: space.xs },
  toggle: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.sm, gap: space.md },
  fieldRow: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  fieldIcon: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center', paddingTop: 6 },
  option: { borderRadius: radius.md, minHeight: 48, justifyContent: 'center', paddingHorizontal: space.md },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
});
