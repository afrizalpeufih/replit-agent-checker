import { useState } from "react";
import { Loader2 } from "lucide-react";
import { TokenModal } from "@/components/TokenModal";
import { CheckResultCard } from "@/components/CheckResultCard";

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

const Index = () => {
  const [token, setToken] = useState("");
  const [activeTab, setActiveTab] = useState<"cek-kartu" | "cek-voucher">("cek-kartu");
  const [description, setDescription] = useState("");
  const [checkResults, setCheckResults] = useState<CheckResult[] | null>(null);
  const [errorResponse, setErrorResponse] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [textareaFocused, setTextareaFocused] = useState(false);

  const handleCheckNow = async () => {
    if (!token) {
      setIsTokenModalOpen(true);
      return;
    }

    if (!description.trim()) return;

    setIsChecking(true);
    setCheckResults([]);
    setErrorResponse(null);

    const numbers = description.split('\n').filter(n => n.trim());
    
    // Initialize all numbers as loading
    const initialResults: CheckResult[] = numbers.map(num => ({
      number: num,
      status: "",
      isLoading: true,
    }));
    setCheckResults(initialResults);

    // Process each number one by one
    for (let i = 0; i < numbers.length; i++) {
      const num = numbers[i];
      
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
        });

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
            };
          } else if (data.results && Array.isArray(data.results) && data.results.length > 0) {
            result = { ...data.results[0], isLoading: false };
          } else if (Array.isArray(data) && data.length > 0) {
            result = { ...data[0], isLoading: false };
          } else {
            result = {
              number: num,
              status: data.status || data.myField || "Selesai",
              isLoading: false,
            };
          }

          // Update the specific result
          setCheckResults(prev => {
            if (!prev) return [result];
            const updated = [...prev];
            updated[i] = result;
            return updated;
          });
        } else {
          // Mark as error
          setCheckResults(prev => {
            if (!prev) return [];
            const updated = [...prev];
            updated[i] = {
              number: num,
              status: "Error",
              isLoading: false,
              isError: true,
              errorMessage: `HTTP ${response.status}: Gagal mendapatkan data`
            };
            return updated;
          });
        }
      } catch (error) {
        // Mark as error
        setCheckResults(prev => {
          if (!prev) return [];
          const updated = [...prev];
          updated[i] = {
            number: num,
            status: "Error",
            isLoading: false,
            isError: true,
            errorMessage: "Kesalahan jaringan"
          };
          return updated;
        });
      }
    }

    setIsChecking(false);
  };

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
              className={`flex-1 py-2.5 px-4 rounded-lg font-semibold font-display transition-all select-none text-sm sm:text-base ${
                activeTab === "cek-kartu"
                  ? "tab-active"
                  : "tab-inactive"
              }`}
            >
              Cek Kartu Perdana
            </button>
            <button
              onClick={() => setActiveTab("cek-voucher")}
              className={`flex-1 py-2.5 px-4 rounded-lg font-semibold font-display transition-all select-none text-sm sm:text-base ${
                activeTab === "cek-voucher"
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
                disabled={isChecking || !description.trim()}
                className="w-full btn-gradient py-3 rounded-lg transition-all duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed font-display"
              >
                {isChecking ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Memproses...
                  </span>
                ) : "Cek Sekarang"}
              </button>

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
                  <h4 className="text-foreground font-semibold font-display flex items-center gap-2">
                    Hasil Pengecekan
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                      {checkResults.length} Nomor
                    </span>
                  </h4>
                  <div className="grid gap-4">
                    {checkResults.map((result, idx) => (
                      <CheckResultCard key={idx} result={result} index={idx} />
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
    </div>
  );
};

export default Index;
