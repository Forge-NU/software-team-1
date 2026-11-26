import { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/context/ProfileContext';
import { MAX_NAME_LENGTH } from '@/lib/profile';

export function DisplayNamePrompt() {
  const { session } = useAuth();
  const { profile, loading, setDisplayName } = useProfile();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const userId = session?.user.id;
  const visible = Boolean(userId && profile?.userId === userId && !loading &&
    profile?.displayName === 'Student' && dismissed !== userId);

  const dismiss = () => {
    if (userId) setDismissed(userId);
    setName('');
    setError('');
  };
  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await setDisplayName(name);
      dismiss();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your name. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { if (!saving) dismiss(); }}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Choose your display name</Text>
          <Text>We removed email-based names to protect student privacy. Choose a name for your public posts.</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName}
            placeholder="Display name" accessibilityLabel="Display name" maxLength={MAX_NAME_LENGTH} editable={!saving} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable disabled={saving || !name.trim()} onPress={save} style={styles.button}>
            <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save name'}</Text>
          </Pressable>
          <Pressable disabled={saving} onPress={dismiss}><Text style={styles.later}>Later</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#0008' },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 24, gap: 14 },
  title: { fontSize: 22, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 12 },
  error: { color: '#b91c1c' },
  button: { backgroundColor: '#222', padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '600' },
  later: { textAlign: 'center', padding: 8 },
});
