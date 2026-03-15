"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar
} from "recharts";
import { AnalyticsData } from "@/lib/types";

export function SubmissionsOverTime({ data }: { data: AnalyticsData[] }) {
    return (
        <Card className="bg-card/50 backdrop-blur-sm border-muted-foreground/20 col-span-1 lg:col-span-2">
            <CardHeader>
                <CardTitle className="text-base font-semibold">Submissions Over Time (30 Days)</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
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
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                            }}
                            labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, marginBottom: '4px' }}
                            itemStyle={{ color: 'hsl(var(--primary))' }}
                        />
                        <Line
                            type="monotone"
                            dataKey="submissions"
                            stroke="hsl(var(--primary))"
                            strokeWidth={3}
                            dot={false}
                            activeDot={{ r: 6, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

export function SubmissionsByWebsite({ data }: { data: { name: string, submissions: number }[] }) {
    return (
        <Card className="bg-card/50 backdrop-blur-sm border-muted-foreground/20 col-span-1">
            <CardHeader>
                <CardTitle className="text-base font-semibold">Submissions per Website</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground) / 0.2)" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        />
                        <Tooltip
                            cursor={{ fill: 'hsl(var(--muted) / 0.5)' }}
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                            }}
                        />
                        <Bar
                            dataKey="submissions"
                            fill="hsl(var(--primary))"
                            radius={[4, 4, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
