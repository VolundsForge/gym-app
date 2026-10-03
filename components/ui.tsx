import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
  type TextInputProps,
  type TextProps,
  type ViewProps,
} from 'react-native';

import Colors, { Radius, Typeface } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

const typeface = Platform.OS === 'web' ? { fontFamily: Typeface.web } : null;

export function useTheme() {
  const scheme = useColorScheme() ?? 'light';
  return Colors[scheme];
}

export function Screen({ style, ...props }: ViewProps) {
  return <View style={[{ flex: 1, backgroundColor: 'transparent' }, style]} {...props} />;
}

export function Card({ style, ...props }: ViewProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.card,
          borderRadius: Radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.border,
          padding: 16,
        },
        style,
      ]}
      {...props}
    />
  );
}

export function Title({ style, ...props }: TextProps) {
  const theme = useTheme();
  return (
    <RNText
      style={[
        {
          ...typeface,
          color: theme.text,
          fontSize: 30,
          fontWeight: '600',
          letterSpacing: -0.8,
          lineHeight: 36,
        },
        style,
      ]}
      {...props}
    />
  );
}

export function Subtitle({ style, ...props }: TextProps) {
  const theme = useTheme();
  return (
    <RNText
      style={[
        { ...typeface, color: theme.textSecondary, fontSize: 15, lineHeight: 22, letterSpacing: -0.1 },
        style,
      ]}
      {...props}
    />
  );
}

export function Body({ style, ...props }: TextProps) {
  const theme = useTheme();
  return (
    <RNText
      style={[{ ...typeface, color: theme.text, fontSize: 16, letterSpacing: -0.15 }, style]}
      {...props}
    />
  );
}

export function Muted({ style, ...props }: TextProps) {
  const theme = useTheme();
  return (
    <RNText
      style={[{ ...typeface, color: theme.textSecondary, fontSize: 13, letterSpacing: -0.05 }, style]}
      {...props}
    />
  );
}

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewProps['style'];
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: ButtonProps) {
  const theme = useTheme();

  const backgrounds = {
    primary: theme.primary,
    secondary: theme.muted,
    danger: theme.danger,
    ghost: 'transparent',
  } as const;

  const textColors = {
    primary: theme.onPrimary,
    secondary: theme.text,
    danger: '#FCFBF8',
    ghost: theme.tint,
  } as const;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: backgrounds[variant],
          borderRadius: Radius.md,
          paddingVertical: 14,
          paddingHorizontal: 18,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled || loading ? 0.5 : pressed ? 0.88 : 1,
          borderWidth: variant === 'ghost' || variant === 'secondary' ? StyleSheet.hairlineWidth : 0,
          borderColor: variant === 'ghost' ? theme.border : theme.border,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={textColors[variant]} />
      ) : (
        <RNText
          style={{
            ...typeface,
            color: textColors[variant],
            fontSize: 16,
            fontWeight: '600',
            letterSpacing: -0.2,
          }}>
          {label}
        </RNText>
      )}
    </Pressable>
  );
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Yes',
  cancelLabel = 'No',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={() => {
        if (!loading) onCancel();
      }}>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(28,28,28,0.4)',
          padding: 0,
          margin: 0,
        }}>
        <View
          style={{
            backgroundColor: theme.card,
            borderColor: theme.border,
            borderRadius: 20,
            padding: 20,
            gap: 12,
            borderWidth: StyleSheet.hairlineWidth,
            width: '86%',
            maxWidth: 400,
            marginLeft: 0,
            marginRight: 0,
          }}>
          <Title style={{ fontSize: 22 }}>{title}</Title>
          <Subtitle>{message}</Subtitle>
          <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
            <Button
              label={cancelLabel}
              variant="secondary"
              disabled={loading}
              onPress={onCancel}
              style={{ flex: 1, minWidth: 0 }}
            />
            <Button
              label={confirmLabel}
              variant={danger ? 'danger' : 'primary'}
              loading={loading}
              onPress={onConfirm}
              style={{ flex: 1, minWidth: 0 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function Input(props: TextInputProps) {
  const theme = useTheme();
  return (
    <TextInput
      placeholderTextColor={theme.textSecondary}
      {...props}
      style={[
        {
          ...typeface,
          backgroundColor: theme.card,
          color: theme.text,
          borderRadius: Radius.md,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.border,
        },
        props.style,
      ]}
    />
  );
}

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card style={{ alignItems: 'center', gap: 8, paddingVertical: 28 }}>
      <Title style={{ fontSize: 20, lineHeight: 26 }}>{title}</Title>
      <Subtitle style={{ textAlign: 'center' }}>{message}</Subtitle>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={{ marginTop: 12, minWidth: 180 }} />
      ) : null}
    </Card>
  );
}

export function StatPill({ label, value }: { label: string; value: string | number }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.muted,
        borderRadius: Radius.md,
        padding: 14,
        gap: 4,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.border,
      }}>
      <Muted>{label}</Muted>
      <Body style={{ fontSize: 22, fontWeight: '600', letterSpacing: -0.4 }}>{value}</Body>
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: selected ? theme.tint : theme.muted,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: Radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: selected ? theme.tint : theme.border,
      }}>
      <Body
        style={{
          color: selected ? theme.onTint : theme.text,
          fontSize: 13,
          fontWeight: '600',
        }}>
        {label}
      </Body>
    </Pressable>
  );
}

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: 8 }}>
      {options.map((item) => (
        <Chip
          key={item}
          label={item}
          selected={value === item}
          onPress={() => onChange(item)}
        />
      ))}
    </ScrollView>
  );
}

export function Badge({
  label,
  tone = 'primary',
}: {
  label: string;
  tone?: 'primary' | 'secondary';
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        backgroundColor: tone === 'primary' ? theme.tintMuted : theme.muted,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: Radius.pill,
        alignSelf: 'flex-start',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: tone === 'primary' ? theme.tint : theme.border,
      }}>
      <Muted
        style={{
          fontWeight: '600',
          color: tone === 'primary' ? theme.tint : theme.textSecondary,
        }}>
        {label}
      </Muted>
    </View>
  );
}

export function MuscleTags({
  primary,
  secondary,
  layout = 'row',
}: {
  primary: string;
  secondary?: string[];
  layout?: 'row' | 'stacked' | 'compact';
}) {
  const extras = (secondary ?? []).filter((group) => group && group !== primary);

  if (layout === 'compact') {
    return (
      <Muted>
        {primary}
        {extras.length ? ` · also ${extras.join(', ')}` : ''}
      </Muted>
    );
  }

  if (layout === 'stacked') {
    return (
      <View style={{ gap: 8 }}>
        <View style={{ gap: 4 }}>
          <Muted>Primary</Muted>
          <Badge label={primary} />
        </View>
        {extras.length > 0 ? (
          <View style={{ gap: 4 }}>
            <Muted>Also trained</Muted>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {extras.map((group) => (
                <Badge key={group} label={group} tone="secondary" />
              ))}
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      <Badge label={primary} />
      {extras.length > 0 ? <Muted>also</Muted> : null}
      {extras.map((group) => (
        <Badge key={group} label={group} tone="secondary" />
      ))}
    </View>
  );
}
