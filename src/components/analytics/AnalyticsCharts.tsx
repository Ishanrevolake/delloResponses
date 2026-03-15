"use client";

import React from "react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    AreaChart,
    Area,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from "recharts";
import { format, subDays } from "date-fns";

// Mock Data for fallback
const CONVERSION_DATA_MOCK = Array.from({ length: 30 }).map((_, i) => ({
    date: format(subDays(new Date(), 29 - i), 'MMM dd'),
    submissions: Math.floor(Math.random() * 5),
}));

export function SubmissionsTrendChart({ data = CONVERSION_DATA_MOCK }: { data?: any[] }) {
    return (
        <Card className="bg-card/50 backdrop-blur-sm border-muted-foreground/20 lg:col-span-2">
            <CardHeader>
                <CardTitle className="text-base font-semibold">Submission Trends</CardTitle>
                <CardDescription>Daily form submissions over the last 30 days</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground) / 0.2)" />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                            allowDecimals={false}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="submissions"
                            stroke="hsl(var(--primary))"
                            fillOpacity={1}
                            fill="url(#colorSub)"
                            strokeWidth={3}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

export function ActivityHeatmap({ submissions }: { submissions: any[] }) {
    // Generate actual intensity based on submissions
    const last30Days = Array.from({ length: 30 }).map((_, i) => {
        const date = format(subDays(new Date(), 29 - i), 'yyyy-MM-dd');
        const count = submissions.filter(s => format(new Date(s.timestamp), 'yyyy-MM-dd') === date).length;
        return { date, count };
    });

    return (
        <Card className="bg-card/50 backdrop-blur-sm border-muted-foreground/20 lg:col-span-2">
            <CardHeader>
                <CardTitle className="text-base font-semibold">Activity Heatmap</CardTitle>
                <CardDescription>Submission intensity over the last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex gap-2">
                    <div className="flex flex-col gap-2 pt-[14px] text-xs text-muted-foreground pr-2">
                        <span>Mon</span>
                        <span>Wed</span>
                        <span>Fri</span>
                    </div>

                    <div className="flex-1 overflow-x-auto pb-4">
                        <div className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-2 min-w-[400px]">
                            {/* We'll show 30 days mapped to a grid */}
                            {last30Days.map((day, i) => {
                                const intensity = Math.min(day.count / 5, 1); // Cap at 5 submissions for max color
                                let bgColor = "bg-muted/30";
                                if (intensity > 0.8) bgColor = "bg-primary font-bold";
                                else if (intensity > 0.5) bgColor = "bg-primary/70";
                                else if (intensity > 0.2) bgColor = "bg-primary/40";
                                else if (intensity > 0) bgColor = "bg-primary/20";

                                return (
                                    <div
                                        key={day.date}
                                        className={`w-5 h-5 rounded-sm ${bgColor} transition-colors hover:ring-2 ring-primary/50 ring-offset-1 ring-offset-background cursor-help`}
                                        title={`${day.count} submissions on ${format(new Date(day.date), 'MMM dd')}`}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
