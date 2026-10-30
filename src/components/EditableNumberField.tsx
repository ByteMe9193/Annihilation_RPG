import React, { useEffect, useState } from "react";
import { StyleProp, TextInput, TextStyle } from "react-native";

type EditableNumberFieldProps = {
  value: number;
  onCommit: (value: number) => void;
  style?: StyleProp<TextStyle>;
  selectionColor?: string;
  selectTextOnFocus?: boolean;
  min?: number;
  max?: number;
  allowNegative?: boolean;
};

export function EditableNumberField({
  value,
  onCommit,
  style,
  selectionColor,
  selectTextOnFocus,
  min,
  max,
  allowNegative = false,
}: EditableNumberFieldProps) {
  const [draft, setDraft] = useState(String(value ?? 0));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(String(value ?? 0));
  }, [value, editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (!trimmed || trimmed === "-") {
      setDraft(String(value ?? 0));
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      setDraft(String(value ?? 0));
      return;
    }
    const clamped = Math.max(min ?? -Infinity, Math.min(max ?? Infinity, parsed));
    setDraft(String(clamped));
    if (clamped !== value) onCommit(clamped);
  };

  return (
    <TextInput
      value={draft}
      onFocus={() => setEditing(true)}
      onBlur={commit}
      onChangeText={(text) => {
        const accepted = allowNegative ? /^-?\d*$/.test(text) : /^\d*$/.test(text);
        if (accepted) setDraft(text);
      }}
      keyboardType={allowNegative ? "numbers-and-punctuation" : "number-pad"}
      selectTextOnFocus={selectTextOnFocus}
      style={style}
      selectionColor={selectionColor}
    />
  );
}
