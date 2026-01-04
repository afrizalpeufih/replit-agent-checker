import { useState, useRef, useMemo } from "react";
import { Download, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import * as XLSX from "xlsx";
import { TokenModal } from "@/components/TokenModal";
import { CheckResultCard } from "@/components/CheckResultCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

const Index = () => {
  const [token, setToken] = useState("");
  const [activeTab, setActiveTab] = useState<"cek-kartu" | "cek-voucher">("cek-kartu");
  const [description, setDescription] = useState("");
  const [checkResults, setCheckResults] = useState<CheckResult[] | null>(null);
  const [errorResponse, setErrorResponse] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [textareaFocused, setTextareaFocused] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const isCancelledRef = useRef(false);

  // Limit Check State
  const [isLimitAlertOpen, setIsLimitAlertOpen] = useState(false);
  const [pendingNumbers, setPendingNumbers] = useState<string[]>([]);

  // Validate phone number prefix
  const isValidPhoneNumber = (number: string): boolean => {
    const cleanNumber = number.trim();
    // Check if starts with 0895, 0896, 0897, 0898, or 0899
    const validPrefixes = ['0895', '0896', '0897', '0898', '0899'];
    return validPrefixes.some(prefix => cleanNumber.startsWith(prefix));
  };

  const processNumbers = async (numbers: string[]) => {
    setIsChecking(true);
    setCheckResults([]);
    setErrorResponse(null);
    isCancelledRef.current = false;
    abortControllerRef.current = new AbortController();

    // Initialize all numbers as loading
    const initialResults: CheckResult[] = numbers.map(num => ({
      number: num,
      status: "",
      isLoading: true,
    }));
    setCheckResults(initialResults);

    const CONCURRENCY_LIMIT = 5;
    let currentIndex = 0;
    let activeWorkers = 0;

    return new Promise<void>((resolve) => {
      const processNext = async () => {
        // Stop if cancelled or done
        if (isCancelledRef.current || (currentIndex >= numbers.length && activeWorkers === 0)) {
          if (activeWorkers === 0) {
            setIsChecking(false);
            resolve();
          }
          return;
        }

        // Stop if no more numbers to process
        if (currentIndex >= numbers.length) {
          return;
        }

        const i = currentIndex++;
        const num = numbers[i];
        activeWorkers++;

        // Validate number format before API call
        if (!isValidPhoneNumber(num)) {
          setCheckResults(prev => {
            if (!prev) return [];
            const updated = [...prev];
            updated[i] = {
              number: num,
              status: "Format Salah",
              isLoading: false,
              isError: true,
              errorMessage: "Nomor harus berawalan 089x (x=5,6,7,8,9)"
            };
            return updated;
          });
          activeWorkers--;
          processNext(); // Try to pick up next task
          return;
        }

        try {
          const response = await fetch("https://n8n-tg6l96v1wbg0.n8x.biz.id/webhook/adakadabra-simsalabim", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              token,
              numbers: [num],
              timestamp: new Date().toISOString()
            }),
            signal: abortControllerRef.current?.signal,
          });

          if (!isCancelledRef.current) {
            if (response.ok) {
              const data = await response.json();
              let result: CheckResult;

              // Parse SimInfo structure from webhook
              if (data.SimInfo && Array.isArray(data.SimInfo) && data.SimInfo.length > 0) {
                const item = data.SimInfo[0];
                result = {
                  number: item.nomor || num,
                  status: item.status || "Aktif",
                  masa_tenggung: item.masaTenggang,
                  terminated: item.kadaluarsa,
                  packages: (item.PackageInfo || []).map((pkg: any) => ({
                    name: pkg.description,
                    aktif: pkg.startDate,
                    berakir: pkg.endDate,
                    quota: pkg.QuotaInfo
                  })),
                  isLoading: false,
                  callPlan: item.callPlan,
                };
              } else if (data.results && Array.isArray(data.results) && data.results.length > 0) {
                result = { ...data.results[0], isLoading: false, callPlan: data.callPlan || data.results[0].callPlan };
              } else if (Array.isArray(data) && data.length > 0) {
                result = { ...data[0], isLoading: false, callPlan: data[0].callPlan };
              } else {
                result = {
                  number: num,
                  status: data.status || data.myField || "Selesai",
                  isLoading: false,
                  callPlan: data.callPlan,
                };
              }

              setCheckResults(prev => {
                if (!prev) return [result];
                const updated = [...prev];
                updated[i] = result;
                return updated;
              });
            } else {
              setCheckResults(prev => {
                if (!prev) return [];
                const updated = [...prev];
                updated[i] = {
                  number: num,
                  status: "Error",
                  isLoading: false,
                  isError: true,
                  errorMessage: `HTTP ${response.status}`
                };
                return updated;
              });
            }
          }
        } catch (error: any) {
          if (!isCancelledRef.current) {
            setCheckResults(prev => {
              if (!prev) return [];
              const updated = [...prev];
              updated[i] = {
                number: num,
                status: "Error",
                isLoading: false,
                isError: true,
                errorMessage: error.name === 'AbortError' ? "Cancelled" : "Network Error"
              };
              return updated;
            });
          }
        } finally {
          activeWorkers--;
          if (isCancelledRef.current) {
            // Handle cancellation for remaining items just once if needed, 
            // but here we just stop processing new ones.
            // You might want to loop remaining and mark as cancelled here if exact UI state is needed.
            // For simplicity, we assume cancel button handler does bulk update.
          } else {
            processNext();
          }

          if (activeWorkers === 0 && currentIndex >= numbers.length) {
            setIsChecking(false);
            resolve();
          }
        }
      };

      // Start initial workers
      for (let w = 0; w < CONCURRENCY_LIMIT; w++) {
        processNext();
      }
    });
  };

  const handleCheckNow = () => {
    if (!token) {
      setIsTokenModalOpen(true);
      return;
    }

    if (!description.trim()) return;

    // Split by newline, trim, and remove unique duplicates
    const rawNumbers = description.split('\n').map(n => n.trim()).filter(n => n);
    const numbers = Array.from(new Set(rawNumbers));

    if (numbers.length > 300) {
      setPendingNumbers(numbers);
      setIsLimitAlertOpen(true);
      return;
    }

    processNumbers(numbers);
  };

  const handleProceedWithLimit = () => {
    const limitedNumbers = pendingNumbers.slice(0, 300);
    setIsLimitAlertOpen(false);
    // Update textarea to show what's being processed
    setDescription(limitedNumbers.join('\n'));
    processNumbers(limitedNumbers);
  };

  const handleCancel = () => {
    isCancelledRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsChecking(false);
    setCheckResults(null);
  };

  const handleDownloadExcel = () => {
    if (!checkResults || checkResults.length === 0) return;

    const excelData = checkResults.map((result, idx) => {
      const packages = result.packages || [];
      return {
        "No": idx + 1,
        "Nomor": result.number,
        "Call Plan": result.callPlan || "-",
        "Status": result.isError ? "Gagal" : (result.masa_tenggung === null || result.masa_tenggung === "" || result.masa_tenggung === "N/A" ? "Tidak Aktif" : result.status),
        "Masa Tenggang": result.masa_tenggung || "-",
        "Kadaluarsa": result.terminated || "-",
        "Paket": packages.map(p => p.name).join(", ") || "-",
        "Quota": packages.map(p => p.quota).join(", ") || "-",
        "Error": result.errorMessage || "-"
      };
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hasil Pengecekan");
    XLSX.writeFile(wb, `hasil-cek-kartu-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const allChecksCompleted = checkResults && checkResults.length > 0 && checkResults.every(r => !r.isLoading);

  // Memoized statistics to avoid recalculating on every render
  const stats = useMemo(() => {
    if (!checkResults || checkResults.length === 0) {
      return { completed: 0, total: 0, aktif: 0, masaTenggang: 0, tidakAktif: 0, progress: 0 };
    }

    const total = checkResults.length;
    let completed = 0;
    let aktif = 0;
    let masaTenggang = 0;
    let tidakAktif = 0;

    for (const r of checkResults) {
      if (!r.isLoading) {
        completed++;
        if (r.isError || !r.masa_tenggung || r.masa_tenggung === "N/A" || r.masa_tenggung.trim() === "") {
          tidakAktif++;
        } else if (r.status?.toLowerCase() === "masa tenggang") {
          masaTenggang++;
        } else if (r.status?.toLowerCase() === "aktif" || r.status?.toLowerCase() === "mantap" || r.status?.toLowerCase() === "success") {
          aktif++;
        }
      }
    }

    return {
      completed,
      total,
      aktif,
      masaTenggang,
      tidakAktif,
      progress: (completed / total) * 100
    };
  }, [checkResults]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/40 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center justify-center px-4 sm:px-6 py-4 relative">
          {/* Title - Centered */}
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight select-none">
              <span className="text-gradient-cyan">
                TOOLS SERBA GUNA
              </span>
            </h1>
          </div>

          {/* Token Input - Absolute right */}
          <div className="absolute right-4 sm:right-6 flex items-center gap-3">
            <button
              onClick={() => setIsTokenModalOpen(true)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-secondary/50 border border-border hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <div className={`w-2 h-2 rounded-full ${token ? "bg-green-500" : "bg-red-500"} ${!token && "animate-pulse-glow"}`}></div>
              <span className="text-sm text-foreground hidden sm:inline">
                {token ? `${token.substring(0, 3)}xxx` : "TOKEN"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6">
        <div className="max-w-3xl mx-auto">
          {/* Tabs */}
          <div className="flex gap-3 sm:gap-4 mb-6 sm:mb-8">
            <button
              onClick={() => setActiveTab("cek-kartu")}
              className={`flex-1 py-2.5 px-4 rounded-lg font-semibold font-display transition-all select-none text-sm sm:text-base ${activeTab === "cek-kartu"
                ? "tab-active"
                : "tab-inactive"
                }`}
            >
              Cek Kartu Perdana
            </button>
            <button
              onClick={() => setActiveTab("cek-voucher")}
              className={`flex-1 py-2.5 px-4 rounded-lg font-semibold font-display transition-all select-none text-sm sm:text-base ${activeTab === "cek-voucher"
                ? "tab-active"
                : "tab-inactive"
                }`}
            >
              Cek Voucher
            </button>
          </div>

          {/* Form Content */}
          {activeTab === "cek-kartu" && (
            <div className="space-y-6 animate-fade-in">
              {/* Input Card - Hidden when checking */}
              {!isChecking && !checkResults && (
                <>
                  <div className="card-glass rounded-xl p-4 sm:p-6">
                    <h3 className="text-foreground font-semibold font-display mb-2 select-none">
                      Masukkan Nomor Kartu
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4 select-none">
                      Bisa cek 1pcs hingga 300pcs. Contoh pengisian ada di bawah ini:
                    </p>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      onFocus={() => setTextareaFocused(true)}
                      onBlur={() => setTextareaFocused(false)}
                      placeholder={"0898xxxxxxx\n0897xxxxxxx\n0896xxxxxxx\n0895xxxxxxx\nDan seterusnya"}
                      className="input-dark w-full resize-none"
                      style={{ caretColor: textareaFocused ? 'hsl(var(--foreground))' : 'transparent' }}
                      rows={6}
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleCheckNow}
                    disabled={!description.trim()}
                    className="w-full btn-gradient py-3 rounded-lg transition-all duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed font-display"
                  >
                    Cek Sekarang
                  </button>
                </>
              )}

              {/* Cancel & Download Buttons - Shown when checking or has results */}
              {(isChecking || checkResults) && (
                <div className="flex gap-3">
                  <button
                    onClick={handleCancel}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-destructive/20 border border-destructive/50 text-destructive hover:bg-destructive/30 transition-all font-display"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    onClick={handleDownloadExcel}
                    disabled={!allChecksCompleted}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30 transition-all font-display disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                    Download Excel
                  </button>
                </div>
              )}

              {/* Error Response */}
              {errorResponse && (
                <div className="mt-6 p-4 sm:p-6 bg-destructive/10 border border-destructive/30 rounded-xl animate-fade-in">
                  <div className="flex items-center gap-3 mb-2 text-red-400">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    <h4 className="font-bold uppercase tracking-widest text-xs font-display">Pesan Sistem / Error</h4>
                  </div>
                  <p className="text-foreground/80 text-sm font-medium leading-relaxed">
                    {errorResponse}
                  </p>
                </div>
              )}

              {/* Results Display */}
              {checkResults && (
                <div className="mt-6 sm:mt-8 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <h4 className="text-foreground font-semibold font-display flex flex-wrap items-center gap-2 shrink-0">
                      Hasil Pengecekan
                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                        {checkResults.filter(r => !r.isLoading).length}/{checkResults.length} Nomor
                      </span>
                      <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded-full">
                        {checkResults.filter(r => !r.isLoading && !r.isError && r.masa_tenggung && r.masa_tenggung !== "N/A" && (r.status?.toLowerCase() === "aktif" || r.status?.toLowerCase() === "mantap" || r.status?.toLowerCase() === "success")).length} Aktif
                      </span>
                      <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                        {checkResults.filter(r => !r.isLoading && !r.isError && r.masa_tenggung && r.masa_tenggung !== "N/A" && r.status?.toLowerCase() === "masa tenggang").length} Masa Tenggang
                      </span>
                      <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">
                        {checkResults.filter(r => !r.isLoading && (r.isError || !r.masa_tenggung || r.masa_tenggung === "N/A" || r.masa_tenggung.trim() === "")).length} Tidak Aktif
                      </span>
                    </h4>
                    <Progress
                      value={(checkResults.filter(r => !r.isLoading).length / checkResults.length) * 100}
                      className="w-full sm:flex-1 h-2"
                    />
                  </div>
                  <div className="grid gap-4">
                    {checkResults.map((result) => (
                      <CheckResultCard key={result.number} result={result} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "cek-voucher" && (
            <div className="text-center py-12 animate-fade-in">
              <div className="card-glass rounded-xl p-8 sm:p-12">
                <div className="text-4xl sm:text-5xl mb-4">🎟️</div>
                <p className="text-muted-foreground select-none font-display text-lg">
                  Fitur Cek Voucher akan segera hadir
                </p>
                <p className="text-muted-foreground/60 text-sm mt-2">
                  Kami sedang mengembangkan fitur ini untuk Anda
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Token Modal */}
      <TokenModal
        isOpen={isTokenModalOpen}
        onOpenChange={setIsTokenModalOpen}
        onSaveToken={setToken}
      />

      {/* Limit Warning Dialog */}
      <AlertDialog open={isLimitAlertOpen} onOpenChange={setIsLimitAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Maksimal input 300 nomor</AlertDialogTitle>
            <AlertDialogDescription>
              Jumlah nomor yang Anda inputkan melebihi batas 300 nomor. Apakah Anda ingin tetap melanjutkan proses untuk 300 nomor saja?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsLimitAlertOpen(false)}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleProceedWithLimit}>
              Ya, Proses 300 Nomor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
