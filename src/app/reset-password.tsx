
import { useEffect, useState } from 'react';
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

import { updatePassword } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import {
    canResetPassword,
    clearPasswordRecovery,
} from '@/lib/passwordRecovery';
import { colors } from '@/theme';

export default function ResetPasswordScreen() {
    const router = useRouter();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingAccess, setCheckingAccess] = useState(true);
    const [recoveryAllowed, setRecoveryAllowed] = useState(false);
    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        let active = true;

        const checkRecovery = async () => {
            try {
                // checks if user opened a valid reset link
                const { data, error } = await supabase.auth.getUser();

                if (active) {
                    setRecoveryAllowed(
                        !error &&
                        canResetPassword(data.user?.id)
                    );
                }
            } catch {
                if (active) {
                    setRecoveryAllowed(false);
                }
            } finally {
                if (active) {
                    setCheckingAccess(false);
                }
            }
        };

        void checkRecovery();

        return () => {
            active = false;
        };
    }, []);

    const handleUpdatePassword = async () => {
        // checks if reset access is allowed
        if (!recoveryAllowed) {
            setMessage(
                'Please open your password reset link from your email.'
            );
            return;
        }

        // checks if both fields are filled out
        if (!password || !confirmPassword) {
            setMessage('Please fill out both fields.');
            return;
        }

        // checks password length
        if (password.length < 8) {
            setMessage('Password must be at least 8 characters.');
            return;
        }

        // makes sure the passwords match
        if (password !== confirmPassword) {
            setMessage('Passwords do not match.');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            // checks the current user before updating
            const { data, error: userError } =
                await supabase.auth.getUser();

            if (
                userError ||
                !data.user ||
                !canResetPassword(data.user.id)
            ) {
                setRecoveryAllowed(false);
                setMessage(
                    'Your reset session is invalid. Please request a new link.'
                );
                return;
            }

            // updates the password through supabase
            const { error } = await updatePassword(password);

            if (error) {
                setMessage(error.message);
                return;
            }

            // clears reset access after updating
            clearPasswordRecovery();
            setRecoveryAllowed(false);

            setIsSuccess(true);
            setMessage('Your password has been updated!');
        } catch {
            setMessage('Something went wrong. Please try again.');
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
                    Reset Password
                </Text>

                <Text style={styles.subtitle}>
                    Enter your new password below.
                </Text>

                {checkingAccess ? (
                    <ActivityIndicator
                        size="large"
                        color={colors.primary}
                    />
                ) : recoveryAllowed && !isSuccess ? (
                    <>
                        <Text style={styles.label}>
                            New Password
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Enter new password"
                            placeholderTextColor="#9CA3AF"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                            autoCapitalize="none"
                            autoComplete="new-password"
                            editable={!loading}
                        />

                        <Text style={styles.label}>
                            Confirm Password
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Confirm new password"
                            placeholderTextColor="#9CA3AF"
                            secureTextEntry
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            autoCapitalize="none"
                            autoComplete="new-password"
                            editable={!loading}
                        />

                        <TouchableOpacity
                            style={[
                                styles.button,
                                loading && styles.disabledButton,
                            ]}
                            onPress={handleUpdatePassword}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.buttonText}>
                                    Update Password
                                </Text>
                            )}
                        </TouchableOpacity>
                    </>
                ) : null}

                {message ? (
                    <Text
                        style={[
                            styles.message,
                            isSuccess ? styles.success : styles.error,
                        ]}
                    >
                        {message}
                    </Text>
                ) : null}

                {!checkingAccess && !recoveryAllowed && !isSuccess ? (
                    <Text style={styles.error}>
                        Please open your password reset link from your email.
                    </Text>
                ) : null}

                {isSuccess ? (
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => router.replace('/')}
                    >
                        <Text style={styles.buttonText}>
                            Continue to Spotted
                        </Text>
                    </TouchableOpacity>
                ) : !checkingAccess ? (
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.replace('/sign-in')}
                    >
                        <Text style={styles.backText}>
                            Back to Sign In
                        </Text>
                    </TouchableOpacity>
                ) : null}
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
        marginBottom: 20,
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
        marginTop: 16,
        lineHeight: 20,
        textAlign: 'center',
    },

    error: {
        color: '#DC2626',
        textAlign: 'center',
        marginTop: 12,
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
