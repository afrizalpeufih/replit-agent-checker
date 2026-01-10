import React, { useState } from "react";
import { ChevronDown, Loader2, AlertCircle } from "lucide-react";

interface VoucherCheckResult {
    serialNumber: string;
    status: string;
    isLoading?: boolean;
    isError?: boolean;
    errorMessage?: string;
    additionalInfo?: any;
}

interface VoucherCheckResultCardProps {
    result: VoucherCheckResult;
    initialExpanded?: boolean;
}

export const VoucherCheckResultCard = React.memo(function VoucherCheckResultCard({ result, initialExpanded = false }: VoucherCheckResultCardProps) {
    const [isExpanded, setIsExpanded] = useState(initialExpanded);

    // Update expansion state if prop changes (e.g. after loading)
    React.useEffect(() => {
        setIsExpanded(initialExpanded);
    }, [initialExpanded]);

    // Show loading state
    if (result.isLoading) {
        return (
            <div
                className="card-glass p-6 rounded-xl flex items-center gap-4 animate-slide-in"
            >
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <div className="flex flex-col gap-1">
                    <span className="text-lg text-foreground font-bold font-display">
                        {result.serialNumber}
                    </span>
                    <span className="text-muted-foreground text-sm">Sedang mengecek...</span>
                </div>
            </div>
        );
    }

    // Show error state
    if (result.isError) {
        return (
            <div
                className="card-glass p-6 rounded-xl flex items-center gap-4 border-destructive/50 bg-destructive/5 animate-slide-in"
            >
                <AlertCircle className="w-5 h-5 text-destructive" />
                <div className="flex flex-col gap-1">
                    <span className="text-lg text-foreground font-bold font-display">
                        {result.serialNumber}
                    </span>
                    <span className="text-destructive text-sm">{result.errorMessage || "Gagal mendapatkan data"}</span>
                </div>
                <div className="ml-auto status-badge status-error">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                    Gagal
                </div>
            </div>
        );
    }

    const getStatusStyle = () => {
        const status = result.status?.toLowerCase();
        const baseStyle = "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border transition-all shadow-sm";

        if (status === "injected" || status === "success" || status === "aktif") {
            return `${baseStyle} bg-green-950/40 text-green-400 border-green-500/20`;
        }
        if (status && (status.includes("not") || status.includes("gagal") || status.includes("error"))) {
            return `${baseStyle} bg-[#2A1515] text-red-500 border-red-500/20`; // Changed to red-500
        }
        return `${baseStyle} bg-blue-950/40 text-blue-400 border-blue-500/20`;
    };

    const getStatusDotStyle = () => {
        const status = result.status?.toLowerCase();
        if (status === "injected" || status === "success" || status === "aktif") {
            return "bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]";
        }
        if (status && (status.includes("not") || status.includes("gagal") || status.includes("error"))) {
            return "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"; // Changed to red-500
        }
        return "bg-blue-400";
    };

    const getStatusText = () => {
        const status = result.status?.toLowerCase();
        if (status === "injected") return "INJECTED";
        if (status && (status.includes("not") || status.includes("gagal"))) return "NOT INJECT";
        return (result.status || "SELESAI").toUpperCase();
    };

    const getVoucherStatusColor = (voucherStatus: string) => {
        const status = voucherStatus?.toLowerCase();
        if (status === "used") return "bg-red-600 text-white border-red-500 shadow-sm"; // Red-600 for deeper red
        if (status === "not used" || status === "notused") return "bg-green-500 text-white border-green-400"; // Green badge
        return "bg-gray-100 text-gray-800 border-gray-200";
    };

    // Helper function to get field value with case-insensitive matching
    const getField = (obj: any, fieldName: string): string => {
        if (!obj) return "-";
        // Try exact match first
        if (obj[fieldName] !== undefined && obj[fieldName] !== null && obj[fieldName] !== "null" && obj[fieldName] !== "") {
            return String(obj[fieldName]);
        }
        // Try lowercase
        const lowerKey = fieldName.toLowerCase();
        for (const key of Object.keys(obj)) {
            if (key.toLowerCase() === lowerKey && obj[key] !== undefined && obj[key] !== null && obj[key] !== "null" && obj[key] !== "") {
                return String(obj[key]);
            }
        }
        return "-";
    };

    // Extract data from additionalInfo - matching webhook field names
    const info = result.additionalInfo || {};

    // Debug: log the additionalInfo to console to see what fields are available (dev only)
    if (import.meta.env.DEV) {
        console.log('Voucher additionalInfo:', info);
    }

    const serialNumber = getField(info, 'SerialNumber') !== "-" ? getField(info, 'SerialNumber') :
        getField(info, 'serialNumber') !== "-" ? getField(info, 'serialNumber') :
            result.serialNumber || "Tidak Diketahui";

    const indukNumber = getField(info, 'IndukNumber') !== "-" ? getField(info, 'IndukNumber') :
        getField(info, 'indukNumber') !== "-" ? getField(info, 'indukNumber') :
            getField(info, 'induk_number') !== "-" ? getField(info, 'induk_number') :
                getField(info, 'Msisdn') !== "-" ? getField(info, 'Msisdn') :
                    getField(info, 'msisdn') !== "-" ? getField(info, 'msisdn') :
                        serialNumber;

    const description = getField(info, 'Description') !== "-" ? getField(info, 'Description') :
        getField(info, 'description');

    const unlockDate = getField(info, 'UnlockDate') !== "-" ? getField(info, 'UnlockDate') :
        getField(info, 'unlockDate') !== "-" ? getField(info, 'unlockDate') :
            getField(info, 'unlock_date') !== "-" ? getField(info, 'unlock_date') :
                "-"; // Using strict unlockDate from response as requested

    const expiryDate = getField(info, 'ExpiryDate') !== "-" ? getField(info, 'ExpiryDate') :
        getField(info, 'expiryDate') !== "-" ? getField(info, 'expiryDate') :
            getField(info, 'expiry_date');

    const voucherStatus = getField(info, 'VoucherStatus') !== "-" ? getField(info, 'VoucherStatus') :
        getField(info, 'voucherStatus') !== "-" ? getField(info, 'voucherStatus') :
            getField(info, 'voucher_status');

    return (
        <div
            className="card-glass p-6 rounded-xl flex flex-col gap-4 hover:border-primary/30 transition-all duration-300 shadow-lg hover:shadow-primary/10 animate-slide-in"
        >
            {/* Header dengan IndukNumber dan status */}
            {/* Header dengan IndukNumber dan status */}
            <div className="flex flex-col gap-2">
                {/* Row 1: IndukNumber & Status */}
                <div className="flex justify-between items-center gap-4">
                    <span className="text-2xl text-foreground font-bold font-display tracking-tight truncate min-w-0 flex-1">
                        {indukNumber}
                    </span>
                    <div className={getStatusStyle()}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusDotStyle()}`}></span>
                        {getStatusText()}
                    </div>
                </div>

                {/* Row 2: Description & VoucherStatus */}
                {(description !== "-" || voucherStatus !== "-") && (
                    <div className="flex justify-between items-center gap-4">
                        <div className="min-w-0 flex-1">
                            {description !== "-" && (
                                <span className="inline-block w-fit px-3 py-0.5 rounded-full bg-pink-400 text-black text-sm font-bold uppercase shadow-sm">
                                    {description}
                                </span>
                            )}
                        </div>
                        <div>
                            {voucherStatus !== "-" && (
                                <span className={`inline-flex items-center justify-center px-3 py-0.5 rounded-full text-xs font-bold uppercase shadow-sm ${getVoucherStatusColor(voucherStatus)} border min-w-[100px]`}>
                                    {voucherStatus}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Key Information Display */}
            <div className="flex flex-col gap-2 -mt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-muted-foreground text-xs">Unlock Date:</span>
                        <span className="text-foreground/80 text-sm font-semibold">{unlockDate}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 sm:items-end sm:text-right">
                        <span className="text-muted-foreground text-xs">Expiry Date:</span>
                        <span className="text-foreground/80 text-sm font-semibold">{expiryDate}</span>
                    </div>
                </div>
            </div>

            {/* Additional info if available */}
            {result.additionalInfo && Object.keys(result.additionalInfo).length > 0 && (
                <>
                    {/* Detail section */}
                    <div className="pt-4 border-t border-border/50">
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-primary text-xs font-black uppercase tracking-widest hover:text-primary/80 transition-colors flex items-center gap-2 mb-4"
                        >
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                            {isExpanded ? "Tutup Detail" : "Lihat Detail"}
                        </button>

                        {isExpanded && (
                            <div className="mt-4 animate-fade-in">
                                <div className="bg-background/60 border border-border/50 p-4 rounded-lg space-y-2">
                                    {[
                                        { label: 'Topup Date', key: 'TopupDate' },
                                        { label: 'Topup MSISDN', key: 'TopupMSISDN' },
                                        { label: 'Serial Number', key: 'SerialNumber' },
                                        { label: 'Unlock RET', key: 'UnlockRET' }
                                    ].map((field) => {
                                        const value = getField(result.additionalInfo, field.key);
                                        return (
                                            <div key={field.key} className="flex flex-col gap-0.5">
                                                <span className="text-muted-foreground text-xs capitalize">{field.label}:</span>
                                                <span className="text-foreground/80 text-sm font-semibold">
                                                    {value}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
});
