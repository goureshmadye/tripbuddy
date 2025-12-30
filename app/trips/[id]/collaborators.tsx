import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTrip, useTripCollaborators } from '@/hooks/use-trips';
import { CollaboratorRole, TripCollaborator } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type CollaboratorWithProfile = TripCollaborator & { name: string; email: string };

const ROLE_CONFIG: Record<CollaboratorRole, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  owner: { label: 'Owner', color: Colors.accent, icon: 'star' },
  editor: { label: 'Can Edit', color: Colors.primary, icon: 'pencil' },
  viewer: { label: 'View Only', color: Colors.secondary, icon: 'eye' },
};

export default function CollaboratorsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const { user: currentUser } = useAuth();
  const { trip, loading: tripLoading } = useTrip(id);
  const { collaborators: rawCollaborators, loading: collabLoading, error } = useTripCollaborators(id);

  const [inviteEmail, setInviteEmail] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [selectedRole, setSelectedRole] = useState<CollaboratorRole>('editor');

  const loading = tripLoading || collabLoading;

  // Build collaborators list with the owner first
  const collaborators: CollaboratorWithProfile[] = React.useMemo(() => {
    const members: CollaboratorWithProfile[] = [];

    // Add the trip creator as owner
    if (trip?.creator) {
      members.push({
        id: 'owner-' + trip.creatorId,
        tripId: id || '',
        userId: trip.creatorId,
        role: 'owner',
        name: trip.creator.name,
        email: trip.creator.email,
      });
    }

    // Add other collaborators
    rawCollaborators.forEach((collab) => {
      // Skip if this is the owner (already added)
      if (collab.userId === trip?.creatorId) return;
      
      members.push({
        id: collab.id,
        tripId: collab.tripId,
        userId: collab.userId,
        role: collab.role,
        name: collab.user?.name || 'Unknown',
        email: collab.user?.email || '',
      });
    });

    return members;
  }, [trip, rawCollaborators, id]);

  const isCurrentUserOwner = currentUser?.id === trip?.creatorId;

  const inviteCode = 'TRIP-ABC123';

  const handleShareLink = async () => {
    try {
      await Share.share({
        message: `Join my trip on TripBuddy! Use code: ${inviteCode}\n\nhttps://tripbuddy.app/join/${inviteCode}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleCopyCode = () => {
    // In a real app, copy to clipboard
    Alert.alert('Copied!', 'Invite code copied to clipboard');
  };

  const handleSendInvite = () => {
    if (!inviteEmail.trim()) return;
    
    Alert.alert('Invite Sent', `Invitation sent to ${inviteEmail}`);
    setInviteEmail('');
    setShowInvite(false);
  };

  const handleRemoveCollaborator = (collaboratorId: string) => {
    Alert.alert(
      'Remove Collaborator',
      'Are you sure you want to remove this person from the trip?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive' },
      ]
    );
  };

  const handleChangeRole = (collaboratorId: string, currentRole: CollaboratorRole) => {
    const roles: CollaboratorRole[] = ['viewer', 'editor'];
    Alert.alert(
      'Change Role',
      'Select a new role for this collaborator',
      [
        ...roles.map(role => ({
          text: ROLE_CONFIG[role].label,
          onPress: () => {},
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerPlaceholder} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Trip Members</Text>
        <TouchableOpacity
          onPress={() => setShowInvite(true)}
          style={[styles.addButton, { backgroundColor: Colors.primary }]}
        >
          <Ionicons name="person-add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : error ? (
          <EmptyState
            icon="alert-circle-outline"
            title="Unable to load members"
            description={error.message || "There was an error loading trip members."}
          />
        ) : (
          <>
        {/* Quick Share */}
        <View style={[styles.shareCard, { backgroundColor: Colors.primary + '10', borderColor: Colors.primary + '30' }]}>
          <View style={styles.shareHeader}>
            <View style={[styles.shareIcon, { backgroundColor: Colors.primary }]}>
              <Ionicons name="link" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.shareContent}>
              <Text style={[styles.shareTitle, { color: colors.text }]}>Share Invite Link</Text>
              <Text style={[styles.shareSubtitle, { color: colors.textSecondary }]}>
                Anyone with the link can join
              </Text>
            </View>
          </View>
          <View style={styles.shareActions}>
            <TouchableOpacity
              style={[styles.codeButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={handleCopyCode}
            >
              <Text style={[styles.codeText, { color: colors.text }]}>{inviteCode}</Text>
              <Ionicons name="copy-outline" size={18} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shareButton, { backgroundColor: Colors.primary }]}
              onPress={handleShareLink}
            >
              <Ionicons name="share-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Invite by Email */}
        {showInvite && (
          <View style={[styles.inviteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.inviteTitle, { color: colors.text }]}>Invite by Email</Text>
            <View style={styles.inviteInput}>
              <TextInput
                style={[styles.emailInput, { backgroundColor: colors.inputBackground, color: colors.text }]}
                placeholder="Enter email address"
                placeholderTextColor={colors.placeholder}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            
            {/* Role Selection */}
            <Text style={[styles.roleLabel, { color: colors.textSecondary }]}>Permission Level</Text>
            <View style={styles.roleOptions}>
              {(['editor', 'viewer'] as CollaboratorRole[]).map(role => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleOption,
                    {
                      backgroundColor: selectedRole === role ? ROLE_CONFIG[role].color + '15' : colors.background,
                      borderColor: selectedRole === role ? ROLE_CONFIG[role].color : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedRole(role)}
                >
                  <Ionicons 
                    name={ROLE_CONFIG[role].icon} 
                    size={18} 
                    color={selectedRole === role ? ROLE_CONFIG[role].color : colors.textSecondary} 
                  />
                  <Text style={[
                    styles.roleOptionText,
                    { color: selectedRole === role ? ROLE_CONFIG[role].color : colors.text },
                  ]}>{ROLE_CONFIG[role].label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inviteActions}>
              <Button
                title="Cancel"
                onPress={() => setShowInvite(false)}
                variant="outline"
                size="sm"
              />
              <Button
                title="Send Invite"
                onPress={handleSendInvite}
                size="sm"
                icon={<Ionicons name="send" size={16} color="#FFFFFF" />}
              />
            </View>
          </View>
        )}

        {/* Collaborators List */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Members ({collaborators.length})
          </Text>
          {collaborators.map((collaborator) => {
            const roleConfig = ROLE_CONFIG[collaborator.role];
            return (
              <View
                key={collaborator.id}
                style={[styles.collaboratorCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.avatar, { backgroundColor: Colors.primary + '20' }]}>
                  <Text style={[styles.avatarText, { color: Colors.primary }]}>
                    {collaborator.name.charAt(0)}
                  </Text>
                </View>
                <View style={styles.collaboratorInfo}>
                  <Text style={[styles.collaboratorName, { color: colors.text }]}>
                    {collaborator.name}
                    {collaborator.userId === currentUser?.id && ' (You)'}
                  </Text>
                  <Text style={[styles.collaboratorEmail, { color: colors.textSecondary }]}>
                    {collaborator.email}
                  </Text>
                </View>
                <View style={styles.collaboratorActions}>
                  <TouchableOpacity
                    style={[styles.roleBadge, { backgroundColor: roleConfig.color + '15' }]}
                    onPress={() => collaborator.role !== 'owner' && handleChangeRole(collaborator.id, collaborator.role)}
                    disabled={collaborator.role === 'owner'}
                  >
                    <Ionicons name={roleConfig.icon} size={14} color={roleConfig.color} />
                    <Text style={[styles.roleBadgeText, { color: roleConfig.color }]}>
                      {roleConfig.label}
                    </Text>
                    {collaborator.role !== 'owner' && (
                      <Ionicons name="chevron-down" size={12} color={roleConfig.color} />
                    )}
                  </TouchableOpacity>
                  {collaborator.role !== 'owner' && (
                    <TouchableOpacity
                      onPress={() => handleRemoveCollaborator(collaborator.id)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="close-circle" size={24} color={Colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Pending Invites */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Pending Invites</Text>
          <View style={[styles.emptyPending, { borderColor: colors.border }]}>
            <Ionicons name="mail-outline" size={32} color={colors.textMuted} />
            <Text style={[styles.emptyPendingText, { color: colors.textSecondary }]}>
              No pending invites
            </Text>
          </View>
        </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerPlaceholder: {
    width: 40,
    height: 40,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  shareCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  shareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  shareIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareContent: {
    flex: 1,
  },
  shareTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  shareSubtitle: {
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  shareActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  codeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  codeText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    fontFamily: 'monospace',
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  inviteTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.sm,
  },
  inviteInput: {
    marginBottom: Spacing.md,
  },
  emailInput: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    fontSize: FontSizes.md,
  },
  roleLabel: {
    fontSize: FontSizes.sm,
    marginBottom: Spacing.xs,
  },
  roleOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    gap: Spacing.xs,
  },
  roleOptionText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  inviteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.sm,
  },
  collaboratorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
  },
  collaboratorInfo: {
    flex: 1,
  },
  collaboratorName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  collaboratorEmail: {
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  collaboratorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  roleBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
  },
  removeButton: {
    padding: Spacing.xs,
  },
  emptyPending: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: Spacing.sm,
  },
  emptyPendingText: {
    fontSize: FontSizes.sm,
  },
});
