export interface Website {
    id: string;
    name: string;
    domain: string;
    status: 'active' | 'inactive';
    totalSubmissions: number;
    lastSubmissionDate: string;
}

export interface Submission {
    id: string;
    websiteId: string;
    name: string;
    email: string;
    message: string;
    data: Record<string, any>;
    timestamp: string;
}

export interface AnalyticsData {
    date: string;
    submissions: number;
}
