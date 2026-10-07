import { memo, useCallback, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Modal,
  Pressable,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { base } from "@/styles/baseStyles";
import { recordModalStyles } from "@/components/modals/TransactionModal.styles";
import { s } from "./TagEditorModal.styles";
const styles = { ...base, ...recordModalStyles };
import { type Palette } from "@/theme/colors";
import { type Tag } from "@/types";
import { type UiCopy } from "@/i18n";
import { loadTags, saveTags, slugifyTagLabel, DEFAULT_TAG_COLOR, addDeletedTagIds, isDuplicateTagLabel } from "@/utils/tags";
import { useModalTransition } from "@/components/ui/useModalTransition";
import { useKeyboardOffset } from "@/components/ui/useKeyboardOffset";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { Text, TextInput } from "@/components/ui/AppText";

export function TagEditorModal({
  visible,
  colors,
  copy,
  tags,
  setTags,
  onClose,
  onCommitTags,
}: {
  visible: boolean;
  colors: Palette;
  copy: UiCopy;
  tags: Tag[];
  setTags: (t: Tag[]) => void;
  onClose: () => void;
  onCommitTags?: (t: Tag[]) => void;
}) {
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState(colors.tagColors[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [editingColor, setEditingColor] = useState("");
  const keyboardOffset = useKeyboardOffset(visible, (height) => Math.min(height * 0.45, 180));
  const persistQueue = useRef<Promise<unknown> | null>(null);
  if (!persistQueue.current) persistQueue.current = Promise.resolve();
  const transition = useModalTransition(visible, 12, 0.985);

  const commitTags = useCallback(
    (next: Tag[]) => {
      setTags(next);
      // Subida inmediata al sheet (si hay cuenta): sin esperar el debounce,
      // para que un reload no pise el cambio con el valor viejo del sheet.
      onCommitTags?.(next);
      persistQueue.current = persistQueue.current!
        .catch(() => undefined)
        .then(() => saveTags(next))
        .catch(() => {
          void loadTags(copy.languageCode === "en" ? "en" : "es").then(setTags);
          Alert.alert(copy.tagsTitle, copy.tagSaveError);
        });
    },
    [copy.languageCode, copy.tagsTitle, copy.tagSaveError, setTags, onCommitTags],
  );

  const startEdit = useCallback((tag: Tag) => {
    setEditingId(tag.id);
    setEditingLabel(tag.label);
    setEditingColor(tag.color);
  }, []);

  const cancelEdit = useCallback(() => setEditingId(null), []);

  const saveEdit = useCallback(() => {
    const label = editingLabel.trim();
    if (!editingId || !label) return;
    // Dos tags con el mismo nombre colapsan en la próxima carga: bloquear.
    if (isDuplicateTagLabel(tags, editingId, label)) {
      Alert.alert(copy.tagsTitle, copy.tagDuplicateError);
      return;
    }
    commitTags(
      tags.map((tag) =>
        tag.id === editingId
          ? { ...tag, label, color: editingColor }
          : tag,
      ),
    );
    setEditingId(null);
  }, [commitTags, editingColor, editingId, editingLabel, tags, copy.tagsTitle, copy.tagDuplicateError]);

  const handleAdd = () => {
    const label = newLabel.trim();
    if (!label) return;
    const key = label.toLocaleLowerCase();
    const newId = slugifyTagLabel(label);
    commitTags([
      ...tags.filter((tag) => tag.label.trim().toLocaleLowerCase() !== key && tag.id !== newId),
      { id: newId, label, color: newColor },
    ]);
    setNewLabel("");
    setNewColor(DEFAULT_TAG_COLOR);
  };

  const handleDelete = useCallback(
    (id: string) => {
      // Tombstone explícito: si no hay internet, el reload no debe resucitarlo.
      void addDeletedTagIds([id]);
      commitTags(tags.filter((tag) => tag.id !== id));
    },
    [commitTags, tags],
  );

  const renderTagItem = useCallback(({ item }: { item: Tag }) => (
    <TagRow
      tag={item}
      colors={colors}
      copy={copy}
      editing={editingId === item.id}
      editingLabel={editingId === item.id ? editingLabel : undefined}
      editingColor={editingId === item.id ? editingColor : undefined}
      onStartEdit={startEdit}
      onChangeLabel={setEditingLabel}
      onChangeColor={setEditingColor}
      onSave={editingId === item.id ? saveEdit : undefined}
      onCancel={editingId === item.id ? cancelEdit : undefined}
      onDelete={handleDelete}
    />
  ), [colors, copy, editingId, editingLabel, editingColor, startEdit, setEditingLabel, setEditingColor, saveEdit, cancelEdit, handleDelete]);

  if (!transition.modalVisible) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <BlurView intensity={30} tint="dark" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      <Animated.View
        style={[
          styles.modalOverlay,
          { backgroundColor: colors.overlay },
          transition.containerStyle,
        ]}
      >
        <Pressable
          style={styles.optionBackdrop}
          onPress={onClose}
        />
        <View
          pointerEvents="box-none"
          style={{
            flex: 1,
            width: "100%",
            justifyContent: "center",
            alignItems: "center",
            transform: [{ translateY: -keyboardOffset }],
          }}
        >
            <Animated.View
              style={[
                styles.recordModal,
                { backgroundColor: colors.card },
                transition.panelStyle,
              ]}
            >
            <Animated.View style={[transition.contentStyle, { flexShrink: 1 }]}>
            <View style={[styles.recordHeader, { borderColor: colors.border }]}>
              <Text style={[styles.recordTitle, { color: colors.text }]}>
                <MaterialCommunityIcons
                  name="tag-multiple"
                  size={19}
                  color={colors.primary}
                />{" "}
                {copy.tagsTitle}
              </Text>
              <Pressable
                style={[styles.closeBtn, { backgroundColor: colors.input }]}
                onPress={onClose}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={22}
                  color={colors.text}
                />
              </Pressable>
            </View>

            <View style={s.body}>
              <View
                style={s.addRow}
              >
                <TextInput
                  value={newLabel}
                  onChangeText={setNewLabel}
                  placeholder={copy.tagsNewPlaceholder}
                  placeholderTextColor={colors.muted}
                  keyboardType="default"
                  style={[s.input, { backgroundColor: colors.input, color: colors.text }]}
                  onSubmitEditing={handleAdd}
                />
                <Pressable
                  onPress={handleAdd}
                  style={[s.addBtn, { backgroundColor: colors.primary }]}
                >
                  <MaterialCommunityIcons
                    name="plus"
                    size={22}
                    color={colors.onPrimary}
                  />
                </Pressable>
              </View>

              <View style={{ paddingHorizontal: 4 }}>
                <ColorPicker color={newColor} onChange={setNewColor} />
              </View>

              {tags.length > 0 && (
                <View style={{ height: 0.5, backgroundColor: colors.border }} />
              )}

              <FlatList
                data={tags}
                keyExtractor={(t) => t.id}
                style={s.flatList}
                keyboardShouldPersistTaps="handled"
                renderItem={renderTagItem}
              />
            </View>
            </Animated.View>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const TagRow = memo(function TagRow({
  tag,
  colors,
  copy,
  editing,
  editingLabel,
  editingColor,
  onStartEdit,
  onChangeLabel,
  onChangeColor,
  onSave,
  onCancel,
  onDelete,
}: {
  tag: Tag;
  colors: Palette;
  copy: UiCopy;
  editing: boolean;
  editingLabel?: string;
  editingColor?: string;
  onStartEdit: (tag: Tag) => void;
  onChangeLabel: (value: string) => void;
  onChangeColor: (value: string) => void;
  onSave?: () => void;
  onCancel?: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <View
      style={s.tagRow}
    >
      <View
        style={[s.tagDot, { backgroundColor: tag.color }]}
      />
      {editing ? (
        <>
          <View style={{ flex: 1, gap: 6 }}>
            <TextInput
              value={editingLabel}
              onChangeText={onChangeLabel}
              keyboardType="default"
              style={[s.editInput, { backgroundColor: colors.input, color: colors.text }]}
              onSubmitEditing={onSave}
            />
            <ColorPicker color={editingColor || tag.color} onChange={onChangeColor} compact />
          </View>
          <Pressable onPress={onSave}>
            <MaterialCommunityIcons
              name="check"
              size={20}
              color={colors.primary}
            />
          </Pressable>
          <Pressable onPress={onCancel}>
            <MaterialCommunityIcons
              name="close"
              size={20}
              color={colors.muted}
            />
          </Pressable>
        </>
      ) : (
        <>
          <Text
            style={[s.tagLabel, { color: colors.text }]}
          >
            {tag.label}
          </Text>
          {tag.id.startsWith("custom-") && (
            <Text
              style={[s.customBadge, { color: colors.muted }]}
            >
              {copy.tagCustomBadge}
            </Text>
          )}
          <Pressable onPress={() => onStartEdit(tag)}>
            <MaterialCommunityIcons
              name="pencil"
              size={18}
              color={colors.muted}
            />
          </Pressable>
          <Pressable onPress={() => onDelete(tag.id)}>
            <MaterialCommunityIcons
              name="trash-can"
              size={18}
              color={colors.expense}
            />
          </Pressable>
        </>
      )}
    </View>
  );
});
