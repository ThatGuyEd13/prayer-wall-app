import React from 'react';
import { Image, ScrollView, TextInput, View } from 'react-native';
import { Text } from '../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
import { Pill } from '../components/Pill';
import { useApp } from '../store';

export function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { ui, onSigninPhone, onSigninName, onSigninPassword, doSignIn, requestCode, phoneKnown } = useApp();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.ground }}
      contentContainerStyle={{ paddingTop: insets.top + 34, paddingHorizontal: 22, paddingBottom: insets.bottom + 24 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Image source={require('../../assets/brand/logo.png')} style={{ height: 88, width: 160, resizeMode: 'contain' }} />
        <Text style={{ fontSize: 11, fontWeight: '500', letterSpacing: 3, textTransform: 'uppercase', color: colors.clay, marginTop: 2 }}>
          Prayer Wall
        </Text>
        <Text style={{ fontSize: 28, fontWeight: '600', letterSpacing: -0.3, marginTop: 6, color: colors.ink }}>
          {phoneKnown ? 'Welcome back' : 'Sign in'}
        </Text>
        <Text style={{ maxWidth: 300, textAlign: 'center', fontSize: 16, lineHeight: 22, color: colors.inkSoft }}>
          Your phone number is how the app knows you. Whatever role the church office set you up as comes back with it.
        </Text>
      </View>

      <View
        style={{
          marginTop: 22,
          borderRadius: radius.card,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: 'rgba(38,34,29,.07)',
          padding: 18,
          gap: 14,
        }}
      >
        {!phoneKnown && (
          <View style={{ gap: 7 }}>
            <Text style={styles.label}>Your name</Text>
            <TextInput
              value={ui.signinName}
              onChangeText={onSigninName}
              placeholder="Name"
              autoCapitalize="words"
              style={styles.input}
              placeholderTextColor="rgba(38,34,29,.35)"
            />
          </View>
        )}
        <View style={{ gap: 7 }}>
          <Text style={styles.label}>Phone number</Text>
          <TextInput
            value={ui.signinPhone}
            onChangeText={onSigninPhone}
            placeholder="(281) 555-0134"
            keyboardType="phone-pad"
            style={styles.input}
            placeholderTextColor="rgba(38,34,29,.35)"
          />
        </View>
        <View style={{ gap: 7 }}>
          <Text style={styles.label}>{phoneKnown ? 'Password' : 'Create a password'}</Text>
          <TextInput
            value={ui.signinPassword}
            onChangeText={onSigninPassword}
            secureTextEntry
            style={styles.input}
          />
          <Text style={{ fontSize: 14, lineHeight: 20, color: colors.inkSoft }}>
            {phoneKnown ? 'The one you set up.' : 'You set this once and keep it.'}
          </Text>
        </View>
      </View>

      {!!ui.signinError && (
        <View
          style={{
            marginTop: 12,
            borderRadius: 16,
            backgroundColor: colors.dangerBg,
            borderWidth: 1,
            borderColor: colors.dangerBorder,
            padding: 13,
          }}
        >
          <Text style={{ fontSize: 15, lineHeight: 21, color: colors.danger }}>{ui.signinError}</Text>
        </View>
      )}

      <Pill
        label={phoneKnown ? 'Sign in' : 'Save it and sign in'}
        onPress={doSignIn}
        style={{ marginTop: 16 }}
      />
      <Pill label="Text a code to this number" onPress={requestCode} variant="outline" style={{ marginTop: 10 }} />
      <Text style={{ marginTop: 18, textAlign: 'center', fontSize: 14, lineHeight: 20, color: colors.inkSoft }}>
        Pastors, the lead pastor, and the owner enter a PIN after this step.
      </Text>
    </ScrollView>
  );
}

const styles = {
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    color: colors.inkSoft,
  },
  input: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.ground,
    borderWidth: 1,
    borderColor: 'rgba(38,34,29,.12)',
    fontSize: 17,
    paddingHorizontal: 15,
    color: colors.ink,
  },
};
