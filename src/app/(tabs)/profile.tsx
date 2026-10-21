import { Text } from 'react-native';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { Button } from '@/components/ui';
import { useAuth } from '@/providers/auth-context';

export default function ProfileScreen() {
  const { email, signOut, isFakeAuth } = useAuth();

  return (
    <PlaceholderScreen title="Profile">
      <Text className="font-sans text-body text-ink">
        Signed in as {email}
        {isFakeAuth ? ' (fake session)' : ''}
      </Text>
      <Button title="Sign out" variant="secondary" onPress={signOut} />
    </PlaceholderScreen>
  );
}
