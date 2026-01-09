import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { parseTokenInput } from "@/lib/helpers";

interface TokenModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveToken: (tokenInput: string, validTokens: string[]) => void;
}

export function TokenModal({ isOpen, onOpenChange, onSaveToken }: TokenModalProps) {
  const [tempApiKey, setTempApiKey] = useState("");
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    error?: string;
    validTokens?: string[];
    totalTokens?: number;
    tokenDetails?: Array<{ phone: string; status: boolean }>;
  } | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const handleTestToken = async () => {
    if (!tempApiKey.trim()) {
      setTestResult({ error: "Masukkan token terlebih dahulu" });
      return;
    }

    setTestLoading(true);
    setTestResult(null);

    try {
      // Send raw token string with # delimiter
      const response = await fetch("https://n8n-tg6l96v1wbg0.n8x.biz.id/webhook/cektoken", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: tempApiKey.trim(),
          numbers: ["0895321806147"], // Test number for validation
          timestamp: new Date().toISOString()
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Parse response to extract token validation results
        if (data.token && Array.isArray(data.token)) {
          const tokenDetails = data.token;
          const validTokens = tokenDetails
            .filter((t: any) => t.status === true)
            .map((t: any) => t.phone);

          const totalTokens = tokenDetails.length;

          if (validTokens.length > 0) {
            setTestResult({
              success: true,
              validTokens,
              totalTokens,
              tokenDetails
            });
          } else {
            setTestResult({
              success: false,
              error: `0 dari ${totalTokens} token valid. Semua token tidak memiliki akses.`,
              totalTokens,
              tokenDetails
            });
          }
        } else {
          setTestResult({ success: false, error: "Format response tidak valid" });
        }
      } else if (response.status === 401 || response.status === 403) {
        setTestResult({ success: false, error: "Token tidak valid atau tidak memiliki akses" });
      } else {
        setTestResult({ success: false, error: `Error ${response.status}: Gagal validasi token` });
      }
    } catch (error) {
      setTestResult({ success: false, error: "Gagal menghubungi server validasi" });
    } finally {
      setTestLoading(false);
    }
  };

  const handleSave = () => {
    if (testResult?.success && testResult?.validTokens) {
      onSaveToken(tempApiKey.trim(), testResult.validTokens);
      onOpenChange(false);
      setTempApiKey("");
      setTestResult(null);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTempApiKey("");
    setTestResult(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground text-lg font-display select-none">
            Masukan Akses Token Anda
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4 pb-2">
          <p className="text-muted-foreground text-sm select-none">
            Anda dapat menghubungi developer untuk mendapatkan akses token secara gratis
          </p>

          <div className="space-y-2">
            <label className="text-foreground/80 text-sm font-medium select-none">
              INPUT TOKEN DISINI
            </label>
            <Input
              type="text"
              placeholder="Kwqdicuxxxxxxxxx"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              className="input-dark"
            />

            {/* Test Result Display */}
            {testResult && (
              <div className="mt-3 space-y-2">
                {/* Summary Banner */}
                <div
                  className={`p-3 rounded-md text-sm font-semibold animate-fade-in ${testResult.success
                    ? "bg-success/10 border border-success/30 text-green-400"
                    : "bg-destructive/10 border border-destructive/30 text-red-400"
                    }`}
                >
                  {testResult.success
                    ? `✓ ${testResult.validTokens?.length} dari ${testResult.totalTokens} token valid`
                    : testResult.error || "Token Invalid, Akses tidak berhasil"}
                </div>

                {/* Token Details List */}
                {testResult.tokenDetails && testResult.tokenDetails.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto space-y-1 bg-muted/20 rounded-md p-2 border border-border/30">
                    {testResult.tokenDetails.map((token, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-xs px-2 py-1 rounded bg-background/50"
                      >
                        {token.status ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                        )}
                        <span className={`font-mono truncate ${token.status ? 'text-green-400' : 'text-red-400/70'}`}>
                          {token.phone}
                        </span>
                        <span className={`ml-auto text-xs ${token.status ? 'text-green-500' : 'text-red-500'}`}>
                          {token.status ? 'Valid' : 'Invalid'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-between pt-3 mt-1 border-t border-border/50">
          <Button
            onClick={handleTestToken}
            disabled={testLoading || !tempApiKey.trim()}
            variant="outline"
            className="w-full sm:w-auto order-3 sm:order-1 border-border text-foreground/80 hover:bg-muted"
          >
            {testLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Testing...
              </span>
            ) : (
              "Test Token"
            )}
          </Button>

          <div className="flex gap-3 w-full sm:w-auto order-1 sm:order-2">
            <Button
              variant="ghost"
              onClick={handleClose}
              className="flex-1 sm:flex-none text-muted-foreground hover:text-foreground"
            >
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={!testResult?.success}
              className="flex-1 sm:flex-none btn-gradient disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Simpan Kunci
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
