import { createClient } from '@/utils/supabase/server'
import { Website, Submission, AnalyticsData } from './types'
import { format, subDays } from 'date-fns'

export async function getUserDashboardData() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return {
            websites: [] as Website[],
            submissions: [] as Submission[],
            lineChartData: [],
            barChartData: [],
        }
    }

    // Check the user's role for RBAC
    const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()

    const isAdmin = roleData?.role === 'admin'

    // Fetch websites based on role
    let websitesQuery = supabase.from('websites').select('*')
    if (!isAdmin) {
        websitesQuery = websitesQuery.eq('owner_id', user.id)
    }

    const { data: websitesRaw } = await websitesQuery

    const websiteMap: Record<string, Website> = {}
    const websites: Website[] = (websitesRaw || []).map((w: any) => {
        const site = {
            id: w.id,
            name: w.name,
            domain: w.domain,
            status: 'active' as const, // In a real app this might be dynamic
            totalSubmissions: 0,
            lastSubmissionDate: w.created_at,
        }
        websiteMap[w.id] = site
        return site
    })

    // If no websites, they have no submissions
    if (websites.length === 0) {
        return {
            websites: [],
            submissions: [],
            lineChartData: generateEmptyLineChart(),
            barChartData: [],
        }
    }

    // Fetch submissions that belong to these websites
    const websiteIds = websites.map((w) => w.id)
    const { data: submissionsRaw } = await supabase
        .from('submissions')
        .select('*')
        .in('website_id', websiteIds)
        .order('created_at', { ascending: false })

    const submissions: Submission[] = []

    // Track daily submissions for Line Chart
    const dailyCounts: Record<string, number> = {}

    // Initialize line chart days
    for (let i = 29; i >= 0; i--) {
        const d = format(subDays(new Date(), i), 'MMM dd')
        dailyCounts[d] = 0
    }

    if (submissionsRaw) {
        submissionsRaw.forEach((row: any) => {
            const rowData = row.data || {}
            // Create the frontend shaped object
            const sub: Submission = {
                id: row.id,
                websiteId: row.website_id,
                name: rowData.fullName || rowData.name || 'Unknown',
                email: rowData.email || 'Unknown',
                message: rowData.message || 'No message provided',
                data: rowData,
                timestamp: row.created_at,
            }
            submissions.push(sub)

            // Add to website total
            if (websiteMap[row.website_id]) {
                websiteMap[row.website_id].totalSubmissions += 1

                // Update last submission date if newer
                if (new Date(row.created_at) > new Date(websiteMap[row.website_id].lastSubmissionDate)) {
                    websiteMap[row.website_id].lastSubmissionDate = row.created_at
                }
            }

            // Add to daily count
            const dayFormat = format(new Date(row.created_at), 'MMM dd')
            if (dailyCounts[dayFormat] !== undefined) {
                dailyCounts[dayFormat] += 1
            }
        })
    }

    const lineChartData = Object.entries(dailyCounts).map(([date, count]) => ({
        date,
        submissions: count,
    }))

    const barChartData = websites.map((w) => ({
        name: w.name,
        submissions: w.totalSubmissions,
    }))

    return {
        websites: Object.values(websiteMap),
        submissions,
        lineChartData,
        barChartData,
    }
}

function generateEmptyLineChart() {
    return Array.from({ length: 30 }).map((_, i) => ({
        date: format(subDays(new Date(), 29 - i), 'MMM dd'),
        submissions: 0,
    }))
}
