import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSubscription, useTripUsage } from '@/hooks/use-subscription';
import { useTrip, useTripCollaborators, useTripInvitations } from '@/hooks/use-trips';
import {
    cancelInvitation,
    createInvitation,
    getUserByEmail,
    removeCollaborator,
    resendInvitation,
    updateCollaboratorRole,
} from '@/services/firestore';
import {
    notifyCollaboratorRemoved,
    notifyTripInvitation
} from '@/services/notifications';
import { CollaboratorRole, TripCollaborator, TripInvitation } from '@/types/database';
import { validateEmail } from '@/utils/validation';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
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

const ROLE_CONFIG: Record<CollaboratorRole, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap; description: string }> = {
  owner: { label: 'Owner', color: Colors.accent, icon: 'star', description: 'Full control over the trip' },
  editor: { label: 'Can Edit', color: Colors.primary, icon: 'pencil', description: 'Can add and modify content' },
  viewer: { label: 'View Only', color: Colors.secondary, icon: 'eye', description: 'Can only view content' },
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
  const { pendingInvitations, loading: invitationsLoading } = useTripInvitations(id);
  
  // Subscription and usage limits
  const { limits } = useSubscription();
  const { usage, collaboratorAccess, refresh: refreshUsage } = useTripUsage(id || '');
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const [inviteEmail, setInviteEmail] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [selectedRole, setSelectedRole] = useState<CollaboratorRole>('editor');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

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

  // Get the latest pending invitation code for sharing
  const latestInviteCode = pendingInvitations.length > 0 ? pendingInvitations[0].inviteCode : null;

  const handleShareLink = async (inviteCode: string) => {
    try {
      await Share.share({
        message: `Join my trip "${trip?.title}" on TripBuddy! Use code: ${inviteCode}\n\nhttps://tripbuddy.app/join/${inviteCode}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await Clipboard.setStringAsync(code);
      Alert.alert('Copied!', 'Invite code copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy code');
    }
  };

  const handleSendInvite = async () => {
    // Check collaborator limit before inviting
    if (!collaboratorAccess.allowed) {
      setShowUpgradePrompt(true);
      setShowInvite(false);
      return;
    }

    const email = inviteEmail.trim().toLowerCase();
    
    // Validate email
    if (!email) {
      setInviteError('Please enter an email address');
      return;
    }
    
    if (!validateEmail(email)) {
      setInviteError('Please enter a valid email address');
      return;
    }

    // Check if inviting self
    if (email === currentUser?.email?.toLowerCase()) {
      setInviteError("You can't invite yourself");
      return;
    }

    // Check if already a collaborator
    const isAlreadyMember = collaborators.some(
      c => c.email.toLowerCase() === email
    );
    if (isAlreadyMember) {
      setInviteError('This person is already a member of this trip');
      return;
    }

    if (!id || !currentUser?.id) {
      Alert.alert('Error', 'Unable to send invitation. Please try again.');
      return;
    }

    setSendingInvite(true);
    setInviteError(null);

    try {
      const { id: invitationId, inviteCode } = await createInvitation({
        tripId: id,
        invitedEmail: email,
        invitedBy: currentUser.id,
        role: selectedRole,
      });

      // If the invited user exists, send them a notification
      const invitedUser = await getUserByEmail(email);
      if (invitedUser) {
        notifyTripInvitation(
          invitedUser.id,
          id,
          trip?.title || 'Trip',
          currentUser.name,
          currentUser.id,
          invitationId
        ).catch(console.error);
      }

      // Refresh usage counts
      await refreshUsage();

      Alert.alert(
        'Invitation Sent!',
        `An invitation has been sent to ${email}. Share this code with them: ${inviteCode}`,
        [
          { text: 'Copy Code', onPress: () => handleCopyCode(inviteCode) },
          { text: 'Done' },
        ]
      );
      
      setInviteEmail('');
      setShowInvite(false);
    } catch (error: any) {
      setInviteError(error.message || 'Failed to send invitation');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleRemoveCollaborator = (collaborator: CollaboratorWithProfile) => {
    if (collaborator.role === 'owner') return;
    
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${collaborator.name} from this trip?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            setProcessingAction(collaborator.id);
            try {
              await removeCollaborator(collaborator.id);
              
              // Notify the removed user
              if (currentUser) {
                notifyCollaboratorRemoved(
                  collaborator.userId,
                  trip?.title || 'Trip',
                  currentUser.name,
                  currentUser.id
                ).catch(console.error);
              }
              
              Alert.alert('Removed', `${collaborator.name} has been removed from the trip.`);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove collaborator');
            } finally {
              setProcessingAction(null);
            }
          }
        },
      ]
    );
  };

  const handleChangeRole = (collaborator: CollaboratorWithProfile) => {
    if (collaborator.role === 'owner' || !isCurrentUserOwner) return;

    const roles: CollaboratorRole[] = ['viewer', 'editor'];
    
    Alert.alert(
      'Change Role',
      `Select a new role for ${collaborator.name}`,
      [
        ...roles.map(role => ({
          text: `${ROLE_CONFIG[role].label} - ${ROLE_CONFIG[role].description}`,
          onPress: async () => {
            if (role === collaborator.role) return;
            
            setProcessingAction(collaborator.id);
            try {
              await updateCollaboratorRole(collaborator.id, role);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to update role');
            } finally {
              setProcessingAction(null);
            }
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleCancelInvitation = (invitation: TripInvitation) => {
    Alert.alert(
      'Cancel Invitation',
      `Are you sure you want to cancel the invitation to ${invitation.invitedEmail}?`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Invite',
          style: 'destructive',
          onPress: async () => {
            setProcessingAction(invitation.id);
            try {
              await cancelInvitation(invitation.id);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to cancel invitation');
            } finally {
              setProcessingAction(null);
            }
          },
        },
      ]
    );
  };

  const handleResendInvitation = async (invitation: TripInvitation) => {
    setProcessingAction(invitation.id);
    try {
      const newCode = await resendInvitation(invitation.id);
      Alert.alert(
        'Invitation Resent',
        `A new invitation code has been generated: ${newCode}`,
        [
          { text: 'Copy Code', onPress: () => handleCopyCode(newCode) },
          { text: 'Done' },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend invitation');
    } finally {
      setProcessingAction(null);
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  const getExpiryText = (expiresAt: Date): { text: string; isExpiringSoon: boolean } => {
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs <= 0) return { text: 'Expired', isExpiringSoon: true };
    if (diffHours < 24) return { text: `Expires in ${diffHours}h`, isExpiringSoon: true };
    if (diffDays === 1) return { text: 'Expires tomorrow', isExpiringSoon: false };
    return { text: `Expires in ${diffDays} days`, isExpiringSoon: false };
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
        {/* Collaborator Limit Warning */}
        {!collaboratorAccess.allowed && (
          <LimitWarning
            type="collaborator"
            current={usage?.collaboratorCount || 0}
            limit={limits.maxCollaboratorsPerTrip}
            onUpgrade={() => setShowUpgradePrompt(true)}
          />
        )}

        {/* Quick Share - Only show if there's an invite code or owner can create one */}
        {isCurrentUserOwner && (
          <View style={[styles.shareCard, { backgroundColor: Colors.primary + '10', borderColor: Colors.primary + '30' }]}>
            <View style={styles.shareHeader}>
              <View style={[styles.shareIcon, { backgroundColor: Colors.primary }]}>
                <Ionicons name="link" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.shareContent}>
                <Text style={[styles.shareTitle, { color: colors.text }]}>Invite People</Text>
                <Text style={[styles.shareSubtitle, { color: colors.textSecondary }]}>
                  Send email invitations or share a code
                </Text>
              </View>
            </View>
            {latestInviteCode && (
              <View style={styles.shareActions}>
                <TouchableOpacity
                  style={[styles.codeButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleCopyCode(latestInviteCode)}
                >
                  <Text style={[styles.codeText, { color: colors.text }]}>{latestInviteCode}</Text>
                  <Ionicons name="copy-outline" size={18} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.shareButton, { backgroundColor: Colors.primary }]}
                  onPress={() => handleShareLink(latestInviteCode)}
                >
                  <Ionicons name="share-outline" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Invite by Email */}
        {showInvite && (
          <View style={[styles.inviteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.inviteTitle, { color: colors.text }]}>Invite by Email</Text>
            <View style={styles.inviteInput}>
              <TextInput
                style={[
                  styles.emailInput, 
                  { 
                    backgroundColor: colors.inputBackground, 
                    color: colors.text,
                    borderColor: inviteError ? Colors.error : 'transparent',
                    borderWidth: inviteError ? 1 : 0,
                  }
                ]}
                placeholder="Enter email address"
                placeholderTextColor={colors.placeholder}
                value={inviteEmail}
                onChangeText={(text) => {
                  setInviteEmail(text);
                  if (inviteError) setInviteError(null);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!sendingInvite}
              />
            </View>
            {inviteError && (
              <Text style={styles.errorText}>{inviteError}</Text>
            )}
            
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
                  disabled={sendingInvite}
                >
                  <Ionicons 
                    name={ROLE_CONFIG[role].icon} 
                    size={18} 
                    color={selectedRole === role ? ROLE_CONFIG[role].color : colors.textSecondary} 
                  />
                  <View>
                    <Text style={[
                      styles.roleOptionText,
                      { color: selectedRole === role ? ROLE_CONFIG[role].color : colors.text },
                    ]}>{ROLE_CONFIG[role].label}</Text>
                    <Text style={[styles.roleDescription, { color: colors.textSecondary }]}>
                      {ROLE_CONFIG[role].description}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inviteActions}>
              <Button
                title="Cancel"
                onPress={() => {
                  setShowInvite(false);
                  setInviteEmail('');
                  setInviteError(null);
                }}
                variant="outline"
                size="sm"
                disabled={sendingInvite}
              />
              <Button
                title={sendingInvite ? "Sending..." : "Send Invite"}
                onPress={handleSendInvite}
                size="sm"
                loading={sendingInvite}
                icon={!sendingInvite ? <Ionicons name="send" size={16} color="#FFFFFF" /> : undefined}
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
            const isProcessing = processingAction === collaborator.id;
            return (
              <View
                key={collaborator.id}
                style={[
                  styles.collaboratorCard, 
                  { 
                    backgroundColor: colors.card, 
                    borderColor: colors.border,
                    opacity: isProcessing ? 0.6 : 1,
                  }
                ]}
              >
                {isProcessing && (
                  <View style={styles.processingOverlay}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                  </View>
                )}
                <View style={[styles.avatar, { backgroundColor: Colors.primary + '20' }]}>
                  <Text style={[styles.avatarText, { color: Colors.primary }]}>
                    {collaborator.name.charAt(0).toUpperCase()}
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
                    onPress={() => handleChangeRole(collaborator)}
                    disabled={collaborator.role === 'owner' || !isCurrentUserOwner || isProcessing}
                  >
                    <Ionicons name={roleConfig.icon} size={14} color={roleConfig.color} />
                    <Text style={[styles.roleBadgeText, { color: roleConfig.color }]}>
                      {roleConfig.label}
                    </Text>
                    {collaborator.role !== 'owner' && isCurrentUserOwner && (
                      <Ionicons name="chevron-down" size={12} color={roleConfig.color} />
                    )}
                  </TouchableOpacity>
                  {collaborator.role !== 'owner' && isCurrentUserOwner && (
                    <TouchableOpacity
                      onPress={() => handleRemoveCollaborator(collaborator)}
                      style={styles.removeButton}
                      disabled={isProcessing}
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
        {isCurrentUserOwner && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Pending Invites {pendingInvitations.length > 0 && `(${pendingInvitations.length})`}
            </Text>
            {invitationsLoading ? (
              <View style={styles.loadingSmall}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : pendingInvitations.length === 0 ? (
              <View style={[styles.emptyPending, { borderColor: colors.border }]}>
                <Ionicons name="mail-outline" size={32} color={colors.textMuted} />
                <Text style={[styles.emptyPendingText, { color: colors.textSecondary }]}>
                  No pending invites
                </Text>
                <Text style={[styles.emptyPendingHint, { color: colors.textMuted }]}>
                  Tap the + button to invite someone
                </Text>
              </View>
            ) : (
              pendingInvitations.map((invitation) => {
                const roleConfig = ROLE_CONFIG[invitation.role];
                const expiryInfo = getExpiryText(invitation.expiresAt);
                const isProcessing = processingAction === invitation.id;
                
                return (
                  <View
                    key={invitation.id}
                    style={[
                      styles.invitationCard, 
                      { 
                        backgroundColor: colors.card, 
                        borderColor: colors.border,
                        opacity: isProcessing ? 0.6 : 1,
                      }
                    ]}
                  >
                    {isProcessing && (
                      <View style={styles.processingOverlay}>
                        <ActivityIndicator size="small" color={Colors.primary} />
                      </View>
                    )}
                    <View style={[styles.avatar, { backgroundColor: Colors.info + '20' }]}>
                      <Ionicons name="mail" size={20} color={Colors.info} />
                    </View>
                    <View style={styles.invitationInfo}>
                      <Text style={[styles.invitationEmail, { color: colors.text }]}>
                        {invitation.invitedEmail}
                      </Text>
                      <View style={styles.invitationMeta}>
                        <View style={[styles.roleBadgeSmall, { backgroundColor: roleConfig.color + '15' }]}>
                          <Text style={[styles.roleBadgeTextSmall, { color: roleConfig.color }]}>
                            {roleConfig.label}
                          </Text>
                        </View>
                        <Text style={[
                          styles.expiryText, 
                          { color: expiryInfo.isExpiringSoon ? Colors.warning : colors.textSecondary }
                        ]}>
                          {expiryInfo.text}
                        </Text>
                      </View>
                      <Text style={[styles.invitedTimeText, { color: colors.textMuted }]}>
                        Invited {formatTimeAgo(invitation.createdAt)}
                      </Text>
                    </View>
                    <View style={styles.invitationActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: Colors.primary + '15' }]}
                        onPress={() => handleResendInvitation(invitation)}
                        disabled={isProcessing}
                      >
                        <Ionicons name="refresh" size={18} color={Colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.background }]}
                        onPress={() => handleShareLink(invitation.inviteCode)}
                        disabled={isProcessing}
                      >
                        <Ionicons name="share-outline" size={18} color={colors.text} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: Colors.error + '15' }]}
                        onPress={() => handleCancelInvitation(invitation)}
                        disabled={isProcessing}
                      >
                        <Ionicons name="close" size={18} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
          </>
        )}
      </ScrollView>

      {/* Upgrade Prompt Modal */}
      <UpgradePrompt
        visible={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        feature="Collaborator Limit Reached"
        message={`You've used ${usage?.collaboratorCount || 0} of ${limits.maxCollaboratorsPerTrip} collaborators for this trip. Upgrade to Pro to add unlimited collaborators.`}
        currentUsage={usage?.collaboratorCount}
        limit={limits.maxCollaboratorsPerTrip}
        requiredPlan="pro"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
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
    borderRadius: BorderRadius.large,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing['2xl'],
  },
  shareCard: {
    padding: Spacing.cardPadding,
    borderRadius: BorderRadius.card,
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
    borderRadius: BorderRadius.large,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareContent: {
    flex: 1,
  },
  shareTitle: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
  },
  shareSubtitle: {
    fontSize: FontSizes.bodySmall,
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
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
  },
  codeText: {
    fontSize: FontSizes.body,
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
    flexDirection: 'column',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    gap: Spacing.md,
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
  roleBadgeSmall: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  roleBadgeTextSmall: {
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
  emptyPendingHint: {
    fontSize: FontSizes.xs,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.sm,
  },
  roleDescription: {
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  loadingSmall: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  invitationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  invitationInfo: {
    flex: 1,
  },
  invitationEmail: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  invitationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
  },
  expiryText: {
    fontSize: FontSizes.xs,
  },
  invitedTimeText: {
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  invitationActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
