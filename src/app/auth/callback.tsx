
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';

import { handleAuthLink } from '@/lib/authLinks';

export default function AuthCallbackScreen() {
    const router = useRouter();
    const url = Linking.useURL();

    const lastProcessedUrl = useRef<string | null>(null);

    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<
        string | null
    >(null);

    useEffect(() => {
        // checks if there's a link to verify
        if (!url) {
            setLoading(false);
            setErrorMessage(
                'No authentication link found. Please open the link from your email.'
            );
            return;
        }

        // makes sure we don't process the same link twice
        if (lastProcessedUrl.current === url) {
            return;
        }

        lastProcessedUrl.current = url;

        let active = true;

        async function verifyLink() {
            setLoading(true);
            setErrorMessage(null);

            try {
                // checks the link with supabase
                const result = await handleAuthLink(url!);

                if (!active) return;

                if (result.error) {
                    setErrorMessage(result.error);
                    return;
                }

                // sends user to reset password or home
                if (result.recovery) {
                    router.replace('/reset-password');
                } else {
                    router.replace('/');
                }
            } catch {
                // shows an error if something goes wrong
                if (active) {
                    setErrorMessage(
                        'Something went wrong verifying your link.'
                    );
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        void verifyLink();

        return () => {
            active = false;
        };
    }, [url, router]);

    return (
        <View style={styles.container}>
            {loading ? (
                <>
                    <ActivityIndicator
                        size="large"
                        color="#3B82F6"
                    />
                    <Text style={styles.message}>
                        Verifying your email...
                    </Text>
                </>
            ) : errorMessage ? (
                <>
                    <Text style={styles.title}>
                        Verification failed
                    </Text>

                    <Text style={styles.message}>
                        {errorMessage}
                    </Text>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => router.replace('/sign-in')}
                    >
                        <Text style={styles.buttonText}>
                            Back to Sign In
                        </Text>
                    </TouchableOpacity>
                </>
            ) : (
                <Text style={styles.message}>
                    Verification successful!
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#F8FAFC',
    },

    title: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 12,
        color: '#111827',
    },

    message: {
        fontSize: 16,
        textAlign: 'center',
        color: '#475569',
        marginTop: 16,
    },

    button: {
        backgroundColor: '#3B82F6',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        marginTop: 24,
    },

    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
