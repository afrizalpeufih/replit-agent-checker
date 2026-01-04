import React, { useState } from "react";
import { ChevronDown, Loader2, AlertCircle } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface Package {
  name: string;
  aktif: string;
  berakir: string;
  quota: string;
}

interface CheckResult {
  number: string;
  status: string;
  masa_tenggung?: string;
  terminated?: string;
  packages?: Package[];
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  callPlan?: string;
}

interface CheckResultCardProps {
  result: CheckResult;
}

export const CheckResultCard = React.memo(function CheckResultCard({ result }: CheckResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatNumber = (value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) return value;
    return num.toLocaleString('id-ID');
  };

  const getQuotaColor = (value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) return "text-accent";
    if (num >= 1000) return "text-green-500";
    if (num >= 250) return "text-yellow-500";
    return "text-red-500";
  };

  // Show loading state
  if (result.isLoading) {
    return (
      <div
        className="card-glass p-6 rounded-xl flex items-center gap-4 animate-slide-in"

      >
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <div className="flex flex-col gap-1">
          <span className="text-lg text-foreground font-bold font-display">
            {result.number}
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
            {result.number}
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

  const isMasaTenggangEmpty = !result.masa_tenggung || result.masa_tenggung === "N/A" || result.masa_tenggung.trim() === "";

  const getStatusStyle = () => {
    if (isMasaTenggangEmpty) {
      return "status-badge status-error";
    }
    const status = result.status?.toLowerCase();
    if (status === "mantap" || status === "aktif" || status === "success") {
      return "status-badge status-success";
    }
    if (status === "error" || status === "gagal" || status === "tidak aktif") {
      return "status-badge status-error";
    }
    return "status-badge status-info";
  };

  const getStatusDotStyle = () => {
    if (isMasaTenggangEmpty) {
      return "bg-red-400";
    }
    const status = result.status?.toLowerCase();
    if (status === "mantap" || status === "aktif" || status === "success") {
      return "bg-green-400 animate-pulse";
    }
    if (status === "error" || status === "gagal" || status === "tidak aktif") {
      return "bg-red-400";
    }
    return "bg-blue-400";
  };

  const getStatusText = () => {
    if (isMasaTenggangEmpty) {
      return "Tidak Aktif";
    }
    return result.status || "Selesai";
  };

  return (
    <div
      className="card-glass p-6 rounded-xl flex flex-col gap-6 hover:border-primary/30 transition-all duration-300 shadow-lg hover:shadow-primary/10 animate-slide-in"

    >
      {/* Header dengan nomor dan status */}
      <div className="flex justify-between items-start gap-4">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <span className="text-2xl text-foreground font-bold font-display tracking-tight truncate">
            {result.number || "Nomor Tidak Diketahui"}
          </span>
        </div>
        <div className={getStatusStyle()}>
          <span className={`w-1.5 h-1.5 rounded-full ${getStatusDotStyle()}`}></span>
          {getStatusText()}
        </div>
      </div>

      {/* Info Details - Full width */}
      <div className="flex flex-col gap-1 -mt-4">
        {result.callPlan && (
          <span className="text-xs text-muted-foreground/80 font-medium">
            Callplan : {result.callPlan}
          </span>
        )}
        <span className="text-muted-foreground text-sm">
          Masa Tenggang: <span className="text-foreground/80 font-semibold">{result.masa_tenggung || "N/A"}</span>
        </span>
        <span className="text-muted-foreground text-sm">
          Terminated: <span className="text-foreground/80 font-semibold">{result.terminated || "N/A"}</span>
        </span>
      </div>

      {/* Detail section */}
      <div className="pt-6 border-t border-border/50">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-primary text-xs font-black uppercase tracking-widest hover:text-primary/80 transition-colors flex items-center gap-2 mb-4"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
          {isExpanded ? "Tutup Detail" : "Lihat Detail"}
        </button>

        {isExpanded && (
          <div className="mt-4 animate-fade-in">
            {result.packages && result.packages.length > 0 ? (
              <div className="relative">
                <div className="flex flex-wrap gap-3 max-h-[150px] min-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                  {result.packages.map((pkg, pidx) => (
                    <div key={pidx} className="bg-background/60 border border-border/50 p-2.5 rounded-lg hover:bg-background/80 transition-colors h-full flex flex-col justify-between flex-grow w-auto min-w-[280px]">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-primary text-xs font-bold leading-snug whitespace-nowrap min-h-[1.5em] flex items-center">
                          {pkg.name || "Paket"}
                        </span>
                        <div className="space-y-0 text-[10px]">
                          <div className="flex justify-between items-center gap-4">
                            <span className="text-muted-foreground whitespace-nowrap">Aktif:</span>
                            <span className="text-foreground/80 font-semibold whitespace-nowrap">{pkg.aktif || "-"}</span>
                          </div>
                          <div className="flex justify-between items-center gap-4">
                            <span className="text-muted-foreground whitespace-nowrap">Berakhir:</span>
                            <span className="text-foreground/80 font-semibold whitespace-nowrap">{pkg.berakir || "-"}</span>
                          </div>
                        </div>
                      </div>
                      <div className="pt-2 mt-2 border-t border-border/30 flex items-center justify-between gap-4">
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider whitespace-nowrap">Quota</span>
                        <span className={`${getQuotaColor(pkg.quota)} text-xs font-bold whitespace-nowrap`}>
                          {pkg.quota ? `${formatNumber(pkg.quota)} MB` : "-"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground text-xs py-3">
                Tidak ada data paket
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
