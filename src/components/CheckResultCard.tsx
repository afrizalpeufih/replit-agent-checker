import { useState } from "react";
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
}

interface CheckResultCardProps {
  result: CheckResult;
  index: number;
}

export function CheckResultCard({ result, index }: CheckResultCardProps) {
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
        style={{ animationDelay: `${index * 100}ms` }}
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
        style={{ animationDelay: `${index * 100}ms` }}
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
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Header dengan nomor dan status */}
      <div className="flex justify-between items-start gap-4">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <span className="text-2xl text-foreground font-bold font-display tracking-tight truncate">
            {result.number || "Nomor Tidak Diketahui"}
          </span>
          <span className="text-muted-foreground text-sm">
            Masa Tenggang: <span className="text-foreground/80 font-semibold">{result.masa_tenggung || "N/A"}</span>
          </span>
          <span className="text-muted-foreground text-sm">
            Terminated: <span className="text-foreground/80 font-semibold">{result.terminated || "N/A"}</span>
          </span>
        </div>
        <div className={getStatusStyle()}>
          <span className={`w-1.5 h-1.5 rounded-full ${getStatusDotStyle()}`}></span>
          {getStatusText()}
        </div>
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
                <Carousel
                  opts={{
                    align: "start",
                    loop: false,
                  }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-2">
                    {result.packages.map((pkg, pidx) => (
                      <CarouselItem key={pidx} className="pl-2 basis-full sm:basis-1/2 lg:basis-1/3">
                        <div className="bg-background/60 border border-border/50 p-3 rounded-lg hover:bg-background/80 transition-colors h-full">
                          <div className="flex flex-col gap-2">
                            <span className="text-primary text-xs font-bold leading-snug line-clamp-2">
                              {pkg.name || "Paket"}
                            </span>
                            <div className="space-y-0.5 text-[10px]">
                              <div>
                                <span className="text-muted-foreground">Aktif: </span>
                                <span className="text-foreground/80 font-semibold">{pkg.aktif || "-"}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Berakhir: </span>
                                <span className="text-foreground/80 font-semibold">{pkg.berakir || "-"}</span>
                              </div>
                            </div>
                            <span className={`${getQuotaColor(pkg.quota)} text-xs font-bold mt-1`}>
                              {pkg.quota ? `${formatNumber(pkg.quota)} MB` : "-"}
                            </span>
                          </div>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <div className="flex gap-2 mt-3">
                    <CarouselPrevious className="static translate-y-0 bg-background/80 border-border hover:bg-background h-7 w-7" />
                    <CarouselNext className="static translate-y-0 bg-background/80 border-border hover:bg-background h-7 w-7" />
                  </div>
                </Carousel>
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
}
