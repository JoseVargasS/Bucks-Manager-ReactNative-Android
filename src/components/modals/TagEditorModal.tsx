import { memo, useCallback, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Modal,
  TouchableOpacity,
  View,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { styles } from "@/styles/globalStyles";
import { s } from "./TagEditorModal.styles";
import { type Palette } from "@/theme/colors";
import { type Tag } from "@/types";
import { type UiCopy } from "@/i18n";
import { loadTags, saveTags, slugifyTagLabel } from "@/utils/tags";
import { useModalTransition } from "@/components/ui/useModalTransition";
import { useKeyboardOffset } from "@/components/ui/useKeyboardOffset";
import { Text, TextInput } from "@/components/ui/AppText";

export function TagEditorModal({
  visible,
  colors,
  copy,
  tags,
  setTags,
  onClose,
}: {
  visible: boolean;
  colors: Palette;
  copy: UiCopy;
  tags: Tag[];
  setTags: (t: Tag[]) => void;
  onClose: () => void;
}) {
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState(colors.tagColors[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [editingColor, setEditingColor] = useState("");
  const keyboardOffset = useKeyboardOffset(visible, (height) => Math.min(height * 0.45, 180));
  const persistQueue = useRef(Promise.resolve());
  const transition = useModalTransition(visible, 12, 0.985);

  const commitTags = useCallback(
    (next: Tag[]) => {
      setTags(next);
      persistQueue.current = persistQueue.current
        .catch(() => undefined)
        .then(() => saveTags(next))
        .catch(() => {
          void loadTags(copy.languageCode === "en" ? "en" : "es").then(setTags);
          Alert.alert(copy.tagsTitle, copy.tagSaveError);
        });
    },
    [copy.languageCode, copy.tagsTitle, copy.tagSaveError, setTags],
  );

  const startEdit = useCallback((tag: Tag) => {
    setEditingId(tag.id);
    setEditingLabel(tag.label);
    setEditingColor(tag.color);
  }, []);

  const cancelEdit = useCallback(() => setEditingId(null), []);

  const saveEdit = useCallback(() => {
    if (!editingId || !editingLabel.trim()) return;
    commitTags(
      tags.map((tag) =>
        tag.id === editingId
          ? { ...tag, label: editingLabel.trim(), color: editingColor }
          : tag,
      ),
    );
    setEditingId(null);
  }, [commitTags, editingColor, editingId, editingLabel, tags]);

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
    setNewColor(colors.tagColors[0]);
  };

  const handleDelete = useCallback(
    (id: string) => commitTags(tags.filter((tag) => tag.id !== id)),
    [commitTags, tags],
  );

  if (!transition.modalVisible) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={[
          styles.modalOverlay,
          { backgroundColor: colors.overlay },
          transition.containerStyle,
        ]}
      >
        <TouchableOpacity
          style={styles.optionBackdrop}
          activeOpacity={1}
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
            <View style={[styles.recordHeader, { borderColor: colors.border }]}>
              <Text style={[styles.recordTitle, { color: colors.text }]}>
                <MaterialCommunityIcons
                  name="tag-multiple"
                  size={19}
                  color={colors.primary}
                />{" "}
                {copy.tagsTitle}
              </Text>
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: colors.input }]}
                onPress={onClose}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={22}
                  color={colors.text}
                />
              </TouchableOpacity>
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
                  style={[s.input, { backgroundColor: colors.input, color: colors.text }]}
                  onSubmitEditing={handleAdd}
                />
                <TouchableOpacity
                  onPress={handleAdd}
                  style={[s.addBtn, { backgroundColor: colors.primary }]}
                >
                  <MaterialCommunityIcons
                    name="plus"
                    size={22}
                    color={colors.onPrimary}
                  />
                </TouchableOpacity>
              </View>

              <View style={s.colorSwatches}>
                {colors.tagColors.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setNewColor(c)}
                    style={[s.swatch, { backgroundColor: c, borderColor: newColor === c ? colors.text : "transparent" }]}
                  />
                ))}
              </View>

              {tags.length > 0 && (
                <View style={{ height: 0.5, backgroundColor: colors.border }} />
              )}

              <FlatList
                data={tags}
                keyExtractor={(t) => t.id}
                style={s.flatList}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TagRow
                    tag={item}
                    colors={colors}
                    copy={copy}
                    editing={editingId === item.id}
                    editingLabel={
                      editingId === item.id ? editingLabel : undefined
                    }
                    editingColor={
                      editingId === item.id ? editingColor : undefined
                    }
                    onStartEdit={startEdit}
                    onChangeLabel={setEditingLabel}
                    onChangeColor={setEditingColor}
                    onSave={editingId === item.id ? saveEdit : undefined}
                    onCancel={editingId === item.id ? cancelEdit : undefined}
                    onDelete={handleDelete}
                  />
                )}
              />
            </View>
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
          <TextInput
            value={editingLabel}
            onChangeText={onChangeLabel}
            style={[s.editInput, { backgroundColor: colors.input, color: colors.text }]}
            onSubmitEditing={onSave}
          />
          <View
            style={s.editColorRow}
          >
            {colors.tagColors.map((color) => (
              <TouchableOpacity
                key={color}
                onPress={() => onChangeColor(color)}
                style={[s.editColorDot, { backgroundColor: color, borderColor: editingColor === color ? colors.text : "transparent" }]}
              />
            ))}
          </View>
          <TouchableOpacity onPress={onSave}>
            <MaterialCommunityIcons
              name="check"
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={onCancel}>
            <MaterialCommunityIcons
              name="close"
              size={20}
              color={colors.muted}
            />
          </TouchableOpacity>
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
          <TouchableOpacity onPress={() => onStartEdit(tag)}>
            <MaterialCommunityIcons
              name="pencil"
              size={18}
              color={colors.muted}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(tag.id)}>
            <MaterialCommunityIcons
              name="trash-can"
              size={18}
              color={colors.red}
            />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
});
