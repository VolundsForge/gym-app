import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
  type TextInputProps,
  type TextProps,
  type ViewProps,
} from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export function useTheme() {
  const scheme = useColorScheme() ?? 'light';
  return Colors[scheme];
}

export function Screen({ style, ...props }: ViewProps) {
  const theme = useTheme();
  return (
    <View
      style={[{ flex: 1, backgroundColor: theme.background }, style]}
      {...props}
    />
  );
}

export function Card({ style, ...props }: ViewProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.card,
          borderRadius: 16,
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
          color: theme.text,
          fontSize: 28,
          fontWeight: '700',
          letterSpacing: -0.5,
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
      style={[{ color: theme.textSecondary, fontSize: 15, lineHeight: 22 }, style]}
      {...props}
    />
  );
}

export function Body({ style, ...props }: TextProps) {
  const theme = useTheme();
  return (
    <RNText style={[{ color: theme.text, fontSize: 16 }, style]} {...props} />
  );
}

export function Muted({ style, ...props }: TextProps) {
  const theme = useTheme();
  return (
    <RNText style={[{ color: theme.textSecondary, fontSize: 13 }, style]} {...props} />
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
    primary: theme.tint,
    secondary: theme.muted,
    danger: theme.danger,
    ghost: 'transparent',
  } as const;

  const textColors = {
    primary: '#FFFFFF',
    secondary: theme.text,
    danger: '#FFFFFF',
    ghost: theme.tint,
  } as const;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: backgrounds[variant],
          borderRadius: 14,
          paddingVertical: 14,
          paddingHorizontal: 18,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled || loading ? 0.5 : pressed ? 0.85 : 1,
          borderWidth: variant === 'ghost' ? StyleSheet.hairlineWidth : 0,
          borderColor: theme.border,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={textColors[variant]} />
      ) : (
        <RNText
          style={{
            color: textColors[variant],
            fontSize: 16,
            fontWeight: '700',
          }}>
          {label}
        </RNText>
      )}
    </Pressable>
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
          backgroundColor: theme.muted,
          color: theme.text,
          borderRadius: 12,
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
      <Title style={{ fontSize: 20 }}>{title}</Title>
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
        borderRadius: 14,
        padding: 14,
        gap: 4,
      }}>
      <Muted>{label}</Muted>
      <Body style={{ fontSize: 22, fontWeight: '700' }}>{value}</Body>
    </View>
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
  const theme = useTheme();
  return (
    <FlatList
      horizontal
      data={[...options]}
      keyExtractor={(item) => item}
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: 8 }}
      renderItem={({ item }) => {
        const selected = value === item;
        return (
          <Pressable
            onPress={() => onChange(item)}
            style={{
              backgroundColor: selected ? theme.tint : theme.muted,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
            }}>
            <Body
              style={{
                color: selected ? '#fff' : theme.text,
                fontSize: 13,
                fontWeight: '600',
              }}>
              {item}
            </Body>
          </Pressable>
        );
      }}
    />
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
        backgroundColor: theme.muted,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        alignSelf: 'flex-start',
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
