import { Website, Submission } from "./types";
import { subDays, format } from "date-fns";

export const WEBSITES: Website[] = [
    { id: "w1", name: "Global Tech", domain: "globaltech.io", status: "active", totalSubmissions: 1345, lastSubmissionDate: new Date().toISOString() },
    { id: "w2", name: "Acme Corp", domain: "acme.com", status: "active", totalSubmissions: 820, lastSubmissionDate: subDays(new Date(), 1).toISOString() },
    { id: "w3", name: "Starlight SaaS", domain: "starlight.app", status: "inactive", totalSubmissions: 415, lastSubmissionDate: subDays(new Date(), 5).toISOString() },
    { id: "w4", name: "Neon Startup", domain: "neon.co", status: "active", totalSubmissions: 95, lastSubmissionDate: subDays(new Date(), 2).toISOString() },
];

export const SUBMISSIONS: Submission[] = [
    ...Array.from({ length: 150 }).map((_, i) => ({
        id: `s${i}`,
        websiteId: i % 4 === 0 ? "w1" : i % 4 === 1 ? "w2" : i % 4 === 2 ? "w3" : "w4",
        name: `User ${i + 1}`,
        email: `contact${i + 1}@example.com`,
        message: `Hello! I have an inquiry regarding your services. I came across your website and wanted to learn more.`,
        timestamp: subDays(new Date(), Math.floor(Math.random() * 30)).toISOString(),
    })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
];

export const LINE_CHART_DATA = Array.from({ length: 30 }).map((_, i) => ({
    date: format(subDays(new Date(), 29 - i), 'MMM dd'),
    submissions: Math.floor(Math.random() * 80) + 20,
}));

export const BAR_CHART_DATA = WEBSITES.map(w => ({
    name: w.name,
    submissions: w.totalSubmissions,
}));
