import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type StateProps = {
  title?: string;
  subtitle?: string;
};

type ErrorProps = {
  message?: string;
  onRetry?: () => void;
};

type BannerProps = {
  message?: string;
};

export function LoadingState({
  title = "Loading...",
  subtitle,
}: StateProps) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#2563eb" />
      <Text style={styles.stateTitle}>{title}</Text>
      {subtitle ? <Text style={styles.stateSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function ErrorState({
  message = "Something went wrong.",
  onRetry,
}: ErrorProps) {
  return (
    <View style={styles.center}>
      <Text style={styles.errorEmoji}>⚠️</Text>
      <Text style={styles.stateTitle}>Unable to load data</Text>
      <Text style={styles.stateSubtitle}>{message}</Text>

      {onRetry ? (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function EmptyState({
  title = "No data found.",
  subtitle,
}: StateProps) {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>📭</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function ErrorBanner({ message }: BannerProps) {
  if (!message) return null;

  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorBannerText}>{message}</Text>
    </View>
  );
}

export function SuccessBanner({ message }: BannerProps) {
  if (!message) return null;

  return (
    <View style={styles.successBanner}>
      <Text style={styles.successBannerText}>{message}</Text>
    </View>
  );
}

export function InfoBanner({ message }: BannerProps) {
  if (!message) return null;

  return (
    <View style={styles.infoBanner}>
      <Text style={styles.infoBannerText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f9fafb",
  },

  stateTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    textAlign: "center",
  },

  stateSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },

  errorEmoji: {
    fontSize: 36,
  },

  retryButton: {
    marginTop: 16,
    backgroundColor: "#2563eb",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },

  retryButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
  },

  emptyContainer: {
    backgroundColor: "#f3f4f6",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },

  emptyEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#374151",
    textAlign: "center",
  },

  emptySubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },

  errorBanner: {
    backgroundColor: "#fee2e2",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },

  errorBannerText: {
    color: "#991b1b",
  },

  successBanner: {
    backgroundColor: "#dcfce7",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },

  successBannerText: {
    color: "#166534",
  },

  infoBanner: {
    backgroundColor: "#dbeafe",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },

  infoBannerText: {
    color: "#1d4ed8",
  },
});