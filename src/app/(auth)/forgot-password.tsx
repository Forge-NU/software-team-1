
import { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { requestPasswordReset } from '@/lib/auth';
import { colors } from '@/theme';

export default function ForgotPasswordScreen() {
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    const handleResetPassword = async () => {
        // checks if the user entered an email
        if (!email.trim()) {
            setMessage('Please enter your school email.');
            setIsError(true);
            return;
        }

        // makes sure the email is valid
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(email.trim())) {
            setMessage('Please enter a valid email address.');
            setIsError(true);
            return;
        }

        setLoading(true);
        setMessage('');
        setIsError(false);

        try {
            // sends the reset email through supabase
            const { error } = await requestPasswordReset(email);

            if (error) {
                setMessage(error.message);
                setIsError(true);
                return;
            }

            // shows a message after sending the request
            setMessage(
                'If an account exists with this email, you will receive a password reset link.'
            );
        } catch {
            setMessage('Something went wrong. Please try again.');
            setIsError(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.content}>
                <Text style={styles.title}>
                    Forgot Password?
                </Text>

                <Text style={styles.subtitle}>
                    Enter your school email and we'll send you
                    a link to reset your password.
                </Text>

                <Text style={styles.label}>
                    School Email
                </Text>

                <TextInput
                    style={styles.input}
                    placeholder="name@northeastern.edu"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    autoComplete="email"
                    editable={!loading}
                />

                {message ? (
                    <Text
                        style={[
                            styles.message,
                            isError ? styles.error : styles.success,
                        ]}
                    >
                        {message}
                    </Text>
                ) : null}

                <TouchableOpacity
                    style={[
                        styles.button,
                        loading && styles.disabledButton,
                    ]}
                    onPress={handleResetPassword}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.buttonText}>
                            Send Reset Link
                        </Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.replace('/sign-in')}
                >
                    <Text style={styles.backText}>
                        Back to Sign In
                    </Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
    },

    content: {
        padding: 24,
    },

    title: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 12,
    },

    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        lineHeight: 24,
        marginBottom: 32,
    },

    label: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 8,
    },

    input: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: colors.textPrimary,
        marginBottom: 16,
    },

    button: {
        backgroundColor: colors.primary,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 12,
    },

    disabledButton: {
        opacity: 0.6,
    },

    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },

    message: {
        fontSize: 14,
        marginVertical: 8,
        lineHeight: 20,
    },

    error: {
        color: '#DC2626',
    },

    success: {
        color: '#15803D',
    },

    backButton: {
        marginTop: 24,
        alignItems: 'center',
    },

    backText: {
        color: colors.primary,
        fontSize: 15,
        fontWeight: '600',
    },
});
