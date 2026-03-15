"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Search, Download, Calendar as CalendarIcon, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";

import { Submission, Website } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface ResponsesTableProps {
    submissions: Submission[];
    websites: Website[];
}

export function ResponsesTable({ submissions, websites }: ResponsesTableProps) {
    const router = useRouter();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [search, setSearch] = useState("");
    const [websiteFilter, setWebsiteFilter] = useState<string>("all");
    const [date, setDate] = useState<Date | undefined>();
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.refresh();
        // Visual feedback for the refresh
        setTimeout(() => setIsRefreshing(false), 800);
    };

    const handleExport = () => {
        // Flatten the data for Excel - combine primary fields with 'data' object fields
        const exportData = filteredSubmissions.map(sub => {
            const website = websites.find(w => w.id === sub.websiteId);
            return {
                Name: sub.name,
                Email: sub.email,
                Message: sub.message,
                Website: website ? website.name : 'Unknown',
                Date: format(new Date(sub.timestamp), "MMM dd, yyyy HH:mm"),
                ...sub.data
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Responses");

        // Set column widths for better readability
        const wscols = [
            { wch: 20 }, // Name
            { wch: 25 }, // Email
            { wch: 40 }, // Message
            { wch: 20 }, // Website
            { wch: 20 }, // Date
        ];
        worksheet["!cols"] = wscols;

        XLSX.writeFile(workbook, `responses_export_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    };

    const websiteMap = useMemo(() => {
        return websites.reduce((acc, site) => {
            acc[site.id] = site;
            return acc;
        }, {} as Record<string, Website>);
    }, [websites]);

    const dynamicColumns = useMemo(() => {
        const columns = new Set<string>();
        submissions.forEach((sub) => {
            if (sub.data) {
                Object.keys(sub.data).forEach((key) => {
                    // Exclude keys that are already handled by primary columns
                    if (!["name", "fullName", "email", "message"].includes(key)) {
                        columns.add(key);
                    }
                });
            }
        });
        return Array.from(columns);
    }, [submissions]);

    const filteredSubmissions = useMemo(() => {
        return submissions.filter((sub) => {
            const searchLower = search.toLowerCase();
            const matchesSearch =
                sub.name.toLowerCase().includes(searchLower) ||
                sub.email.toLowerCase().includes(searchLower) ||
                sub.message.toLowerCase().includes(searchLower) ||
                Object.values(sub.data || {}).some(val => 
                    String(val).toLowerCase().includes(searchLower)
                );

            const matchesWebsite = websiteFilter === "all" || sub.websiteId === websiteFilter;

            const matchesDate = !date || format(new Date(sub.timestamp), "yyyy-MM-dd") === format(date, "yyyy-MM-dd");

            return matchesSearch && matchesWebsite && matchesDate;
        });
    }, [submissions, search, websiteFilter, date]);

    const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage) || 1;
    const paginatedData = filteredSubmissions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Use a stable set of colors for badges based on website ID
    const getBadgeColor = (websiteId: string) => {
        const colors = [
            "bg-blue-500/15 text-blue-500 hover:bg-blue-500/25",
            "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25",
            "bg-violet-500/15 text-violet-500 hover:bg-violet-500/25",
            "bg-amber-500/15 text-amber-500 hover:bg-amber-500/25",
        ];
        // simple hash
        const index = websiteId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
        return colors[index];
    };

    const formatHeader = (key: string) => {
        return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
    };

    return (
        <div className="flex flex-col h-full bg-card/50 backdrop-blur-sm rounded-xl border border-muted-foreground/20 overflow-hidden">
            {/* Table Toolbar */}
            <div className="p-4 border-b border-muted-foreground/20 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card">
                <div className="flex flex-1 items-center gap-3">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search responses..."
                            className="pl-9 h-9 w-full bg-background"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>

                    <Select
                        value={websiteFilter}
                        onValueChange={(val) => {
                            setWebsiteFilter(val);
                            setCurrentPage(1);
                        }}
                    >
                        <SelectTrigger className="h-9 w-[180px] hidden md:flex bg-background">
                            <SelectValue placeholder="All Websites" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Websites</SelectItem>
                            {websites.map(w => (
                                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={`h-9 hidden lg:flex justify-start text-left font-normal bg-background ${!date ? "text-muted-foreground" : ""}`}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? format(date, "PPP") : "Pick a date"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={(d) => {
                                    setDate(d);
                                    setCurrentPage(1);
                                }}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>

                    {(search || websiteFilter !== "all" || date) && (
                        <Button
                            variant="ghost"
                            className="h-9 px-2 lg:px-3 text-xs"
                            onClick={() => {
                                setSearch("");
                                setWebsiteFilter("all");
                                setDate(undefined);
                                setCurrentPage(1);
                            }}
                        >
                            Reset
                        </Button>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-9 px-3 bg-background font-medium hover:bg-muted/50 transition-colors"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button size="sm" className="h-9 px-3 font-medium" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-auto">
                <Table>
                    <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
                        <TableRow className="border-muted-foreground/20 hover:bg-transparent text-xs uppercase tracking-wider">
                            <TableHead className="w-[150px]">Name</TableHead>
                            <TableHead className="w-[180px]">Email</TableHead>
                            {dynamicColumns.map((col) => (
                                <TableHead key={col} className="min-w-[150px]">{formatHeader(col)}</TableHead>
                            ))}
                            <TableHead className="min-w-[200px]">Message</TableHead>
                            <TableHead className="w-[140px]">Website</TableHead>
                            <TableHead className="w-[140px] text-right">Timestamp</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5 + dynamicColumns.length} className="h-48 text-center text-muted-foreground font-medium">
                                    No responses found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedData.map((sub) => (
                                <TableRow key={sub.id} className="border-muted-foreground/10 hover:bg-muted/30 transition-colors">
                                    <TableCell className="font-semibold text-foreground">{sub.name}</TableCell>
                                    <TableCell className="text-muted-foreground font-medium">{sub.email}</TableCell>
                                    {dynamicColumns.map((col) => (
                                        <TableCell key={col} className="text-muted-foreground whitespace-nowrap">
                                            {sub.data[col] || "-"}
                                        </TableCell>
                                    ))}
                                    <TableCell>
                                        <div className="line-clamp-2 text-sm max-w-md text-muted-foreground" title={sub.message}>
                                            {sub.message}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className={`border-transparent font-medium ${getBadgeColor(sub.websiteId)}`}>
                                            {websiteMap[sub.websiteId]?.name || "Unknown"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground whitespace-nowrap text-xs font-medium uppercase">
                                        {format(new Date(sub.timestamp), "MMM dd, yyyy")}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-muted-foreground/20 flex items-center justify-between bg-card">
                <div className="text-sm text-muted-foreground font-medium">
                    Showing <span className="text-foreground">{paginatedData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to <span className="text-foreground">{Math.min(currentPage * itemsPerPage, filteredSubmissions.length)}</span> of <span className="text-foreground">{filteredSubmissions.length}</span> responses
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="bg-background h-8 w-8 p-0"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-sm font-medium px-2">
                        Page {currentPage} of {totalPages}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="bg-background h-8 w-8 p-0"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
