'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from './useCurrentUser'
import {
    createTeamMember,
    updateTeamMember,
    deleteTeamMember,
    resetTeamMemberPassword,
} from '@/actions/team'
import { Profile } from '@/types/database'

const supabase = createClient()

// Query keys
export const teamKeys = {
    all: ['team'] as const,
    lists: () => [...teamKeys.all, 'list'] as const,
    list: (companyId: string) => [...teamKeys.lists(), companyId] as const,
}

const TEAM_ROLES = ['admin', 'fleet_manager', 'dispatcher', 'accountant']

async function fetchTeamMembers(companyId: string): Promise<Profile[]> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('company_id', companyId)
        .in('role', TEAM_ROLES)
        .order('created_at', { ascending: false })

    if (error) throw error
    return (data as Profile[]) || []
}

/**
 * Fetch all non-driver team members for the current company
 */
export function useTeamMembers() {
    const { data: user } = useCurrentUser()
    const companyId = user?.company_id || ''

    return useQuery({
        queryKey: teamKeys.list(companyId),
        queryFn: () => fetchTeamMembers(companyId),
        enabled: !!companyId,
    })
}

/**
 * Create a new team member (calls server action)
 */
export function useCreateTeamMember() {
    const queryClient = useQueryClient()
    const { data: user } = useCurrentUser()

    return useMutation({
        mutationFn: (data: {
            full_name: string
            email: string
            password: string
            role: 'fleet_manager' | 'dispatcher' | 'accountant'
            phone?: string
        }) => createTeamMember(data),
        onSuccess: () => {
            if (user?.company_id) {
                queryClient.invalidateQueries({ queryKey: teamKeys.list(user.company_id) })
            }
        },
    })
}

/**
 * Update a team member's profile fields
 */
export function useUpdateTeamMember() {
    const queryClient = useQueryClient()
    const { data: user } = useCurrentUser()

    return useMutation({
        mutationFn: ({ userId, data }: {
            userId: string
            data: { full_name?: string; role?: string; phone?: string }
        }) => updateTeamMember(userId, data),
        onSuccess: () => {
            if (user?.company_id) {
                queryClient.invalidateQueries({ queryKey: teamKeys.list(user.company_id) })
            }
        },
    })
}

/**
 * Delete a team member (removes from auth + profiles)
 */
export function useDeleteTeamMember() {
    const queryClient = useQueryClient()
    const { data: user } = useCurrentUser()

    return useMutation({
        mutationFn: (userId: string) => deleteTeamMember(userId),
        onSuccess: () => {
            if (user?.company_id) {
                queryClient.invalidateQueries({ queryKey: teamKeys.list(user.company_id) })
            }
        },
    })
}

/**
 * Reset a team member's password
 */
export function useResetTeamMemberPassword() {
    return useMutation({
        mutationFn: ({ userId, newPassword }: { userId: string; newPassword: string }) =>
            resetTeamMemberPassword(userId, newPassword),
    })
}
