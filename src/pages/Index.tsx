import { useState, useRef, useMemo, useCallback } from "react";
import { Download, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import * as XLSX from "xlsx";
import { TokenModal } from "@/components/TokenModal";
import { toast } from "sonner";
import { CheckResultCard } from "@/components/CheckResultCard";
import { VoucherCheckResultCard } from "@/components/VoucherCheckResultCard";
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
import {
  isValidPhoneNumber,
  isValidVoucherSerial,
  getOptimalSettings,
  generateSequentialSerials,
  createBatches,
  fetchWithRetry,
  getTokenForBatch,
} from "@/lib/helpers";

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

interface VoucherCheckResult {
  serialNumber: string;
  status: string;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  additionalInfo?: any;
}

const Index = () => {
  const [token, setToken] = useState(""); // Raw token input string with # delimiter
  const [validTokens, setValidTokens] = useState<string[]>([]); // Array of valid tokens for rotation
  const [activeTab, setActiveTab] = useState<"cek-kartu" | "cek-voucher">("cek-kartu");
  const [description, setDescription] = useState("");
  const [checkResults, setCheckResults] = useState<CheckResult[] | null>(null);
  const [errorResponse, setErrorResponse] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [textareaFocused, setTextareaFocused] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Voucher-specific state - Multiple input rows
  interface VoucherInputRow {
    id: number;
    snAwal: string;
    snAkhir: string;
  }

  const [voucherDescription, setVoucherDescription] = useState("");
  const [voucherInputRows, setVoucherInputRows] = useState<VoucherInputRow[]>([{ id: 1, snAwal: "", snAkhir: "" }]);
  const [nextRowId, setNextRowId] = useState(2);
  const [voucherCheckResults, setVoucherCheckResults] = useState<VoucherCheckResult[] | null>(null);
  const [isCheckingVoucher, setIsCheckingVoucher] = useState(false);
  const [voucherTextareaFocused, setVoucherTextareaFocused] = useState(false);
  const voucherAbortControllerRef = useRef<AbortController | null>(null);

  // Handler functions for multiple rows
  const handleAddRow = useCallback(() => {
    if (voucherInputRows.length >= 50) return; // Max 50 rows
    setVoucherInputRows(prev => [...prev, { id: nextRowId, snAwal: "", snAkhir: "" }]);
    setNextRowId(prev => prev + 1);
  }, [voucherInputRows.length, nextRowId]);

  const handleRemoveRow = useCallback((id: number) => {
    if (voucherInputRows.length <= 1) return; // Keep at least one row
    setVoucherInputRows(prev => prev.filter(row => row.id !== id));
  }, [voucherInputRows.length]);

  const handleUpdateSnAwal = useCallback((id: number, value: string) => {
    setVoucherInputRows(prev => prev.map(row =>
      row.id === id ? { ...row, snAwal: value } : row
    ));
    // Clear error when user starts typing
    setErrorRowId(prev => prev === id ? null : prev);
  }, []);

  const handleUpdateSnAkhir = useCallback((id: number, value: string) => {
    setVoucherInputRows(prev => prev.map(row =>
      row.id === id ? { ...row, snAkhir: value } : row
    ));
    // Clear error when user starts typing
    setErrorRowId(prev => prev === id ? null : prev);
  }, []);

  const isCancelledRef = useRef(false);

  // Limit Check State
  const [isLimitAlertOpen, setIsLimitAlertOpen] = useState(false);
  const [pendingNumbers, setPendingNumbers] = useState<string[]>([]);

  // Voucher Limit Check State
  const [isVoucherLimitAlertOpen, setIsVoucherLimitAlertOpen] = useState(false);
  const [pendingVoucherSerials, setPendingVoucherSerials] = useState<string[]>([]);

  // Voucher Validation Error State
  const [isVoucherErrorAlertOpen, setIsVoucherErrorAlertOpen] = useState(false);
  const [voucherErrorMessage, setVoucherErrorMessage] = useState("");
  const [errorRowId, setErrorRowId] = useState<number | null>(null);



  const processNumbers = async (numbers: string[]) => {
    // Check network quality and get optimal settings
    const settings = getOptimalSettings();

    if (!settings) {
      toast.error("Tidak ada koneksi internet. Cek koneksi Anda.");
      return;
    }

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

    const { BATCH_SIZE, TIMEOUT, MAX_RETRIES, RETRY_DELAY } = settings;

    // Use number of valid tokens as concurrency level
    // More tokens = more parallel workers = faster processing
    const CONCURRENCY = validTokens.length;

    // Create batches
    const batches = createBatches(numbers, BATCH_SIZE);

    let currentBatchIndex = 0;
    let globalBatchCounter = 0; // Track global batch index for token rotation
    let activeWorkers = 0;

    return new Promise<void>((resolve) => {
      const processBatch = async (batch: string[], batchStartIndex: number, batchIndexForToken: number) => {
        activeWorkers++;

        // Get token for this batch using round-robin
        const batchToken = getTokenForBatch(validTokens, batchIndexForToken);

        // Client-side validation for batch
        const validBatch: string[] = [];
        const invalidIndices: number[] = [];

        batch.forEach((num, idx) => {
          const globalIndex = batchStartIndex + idx;

          // Validate length
          if (num.length > 13) {
            setCheckResults(prev => {
              if (!prev) return [];
              const updated = [...prev];
              updated[globalIndex] = {
                number: num,
                status: "Gagal",
                isLoading: false,
                isError: true,
                errorMessage: "Maksimal 13 digit"
              };
              return updated;
            });
            invalidIndices.push(idx);
            return;
          }

          // Validate format
          if (!isValidPhoneNumber(num)) {
            setCheckResults(prev => {
              if (!prev) return [];
              const updated = [...prev];
              updated[globalIndex] = {
                number: num,
                status: "Format Salah",
                isLoading: false,
                isError: true,
                errorMessage: "Nomor harus berawalan 089x (x=5,6,7,8,9)"
              };
              return updated;
            });
            invalidIndices.push(idx);
            return;
          }

          validBatch.push(num);
        });

        // Skip API call if no valid numbers in batch
        if (validBatch.length === 0) {
          activeWorkers--;
          if (!isCancelledRef.current && currentBatchIndex < batches.length) {
            const nextBatch = batches[currentBatchIndex];
            const nextStartIndex = currentBatchIndex * BATCH_SIZE;
            const nextBatchIndexForToken = globalBatchCounter++;
            currentBatchIndex++;
            processBatch(nextBatch, nextStartIndex, nextBatchIndexForToken);
          }

          if (activeWorkers === 0 && currentBatchIndex >= batches.length) {
            setIsChecking(false);
            resolve();
          }
          return;
        }

        try {
          const response = await fetchWithRetry(
            "https://n8n-tg6l96v1wbg0.n8x.biz.id/webhook/adakadabra-simsalabim",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token: batchToken, // Use rotated token for this batch
                numbers: validBatch,
                timestamp: new Date().toISOString()
              }),
              signal: abortControllerRef.current?.signal,
            },
            MAX_RETRIES,
            TIMEOUT,
            RETRY_DELAY
          );

          if (!isCancelledRef.current && response.ok) {
            const data = await response.json();

            // Update results for entire batch at once
            setCheckResults(prev => {
              if (!prev) return [];
              const updated = [...prev];

              // Parse batch response (handle both single and batch returns)
              let results: any[] = [];

              if (data.SimInfo && Array.isArray(data.SimInfo)) {
                results = data.SimInfo;
              } else if (data.results && Array.isArray(data.results)) {
                results = data.results;
              } else if (Array.isArray(data)) {
                results = data;
              } else if (validBatch.length === 1) {
                // Single item response
                results = [data];
              }

              results.forEach((item: any, idx: number) => {
                const globalIndex = batchStartIndex + idx;
                const num = validBatch[idx] || batch[idx];

                updated[globalIndex] = {
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
              });

              return updated;
            });
          } else if (!isCancelledRef.current) {
            // Mark entire batch as error
            setCheckResults(prev => {
              if (!prev) return [];
              const updated = [...prev];
              validBatch.forEach((num, idx) => {
                updated[batchStartIndex + idx] = {
                  number: num,
                  status: "Error",
                  isLoading: false,
                  isError: true,
                  errorMessage: `Batch Error: HTTP ${response.status}`
                };
              });
              return updated;
            });
          }
        } catch (error: any) {
          if (!isCancelledRef.current) {
            let errorMsg = "Network Error";

            if (error.name === 'AbortError') {
              errorMsg = "Request Timeout (10s)";
            } else if (error.message?.includes('Failed to fetch')) {
              errorMsg = "Connection Failed";
            } else if (error.message?.includes('NetworkError')) {
              errorMsg = "Network Error (Check Internet)";
            }

            setCheckResults(prev => {
              if (!prev) return [];
              const updated = [...prev];
              validBatch.forEach((num, idx) => {
                updated[batchStartIndex + idx] = {
                  number: num,
                  status: "Error",
                  isLoading: false,
                  isError: true,
                  errorMessage: errorMsg
                };
              });
              return updated;
            });
          }
        } finally {
          activeWorkers--;

          if (!isCancelledRef.current && currentBatchIndex < batches.length) {
            const nextBatch = batches[currentBatchIndex];
            const nextStartIndex = currentBatchIndex * BATCH_SIZE;
            const nextBatchIndexForToken = globalBatchCounter++;
            currentBatchIndex++;
            processBatch(nextBatch, nextStartIndex, nextBatchIndexForToken);
          }

          if (activeWorkers === 0 && currentBatchIndex >= batches.length) {
            setIsChecking(false);
            resolve();
          }
        }
      };

      // Start initial batch workers
      const initialBatches = Math.min(CONCURRENCY, batches.length);
      for (let i = 0; i < initialBatches; i++) {
        processBatch(batches[i], i * BATCH_SIZE, globalBatchCounter++);
        currentBatchIndex++;
      }

      // Handle empty input
      if (batches.length === 0) {
        setIsChecking(false);
        resolve();
      }
    });
  };

  const handleCheckNow = useCallback(() => {
    if (!token || validTokens.length === 0) {
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
  }, [token, validTokens, description, processNumbers]);

  const handleProceedWithLimit = useCallback(() => {
    const limitedNumbers = pendingNumbers.slice(0, 300);
    setIsLimitAlertOpen(false);
    // Update textarea to show what's being processed
    setDescription(limitedNumbers.join('\n'));
    processNumbers(limitedNumbers);
  }, [pendingNumbers, processNumbers]);

  const handleCancel = useCallback(() => {
    isCancelledRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsChecking(false);
    setCheckResults(null);
  }, []);

  // Voucher processing functions
  const processVoucherSerials = async (serials: string[]) => {
    setIsCheckingVoucher(true);
    setVoucherCheckResults([]);
    isCancelledRef.current = false;
    voucherAbortControllerRef.current = new AbortController();

    // Initialize all serials as loading
    const initialResults: VoucherCheckResult[] = serials.map(serial => ({
      serialNumber: serial,
      status: "",
      isLoading: true,
    }));
    setVoucherCheckResults(initialResults);

    const BATCH_SIZE = 5; // Process 5 vouchers per request
    const TIMEOUT = 10000; // 10 second timeout (faster response)
    const MAX_RETRIES = 2; // Retry 2 times
    const RETRY_DELAY = 1000; // 1 second base delay

    // Use number of valid tokens as concurrency level
    // More tokens = more parallel workers = faster processing
    const CONCURRENCY = validTokens.length;

    // Create batches
    const batches = createBatches(serials, BATCH_SIZE);

    let currentBatchIndex = 0;
    let globalBatchCounter = 0; // Track global batch index for token rotation
    let activeWorkers = 0;

    return new Promise<void>((resolve) => {
      const processBatch = async (batch: string[], batchStartIndex: number, batchIndexForToken: number) => {
        activeWorkers++;

        // Get token for this batch using round-robin
        const batchToken = getTokenForBatch(validTokens, batchIndexForToken);

        // Client-side validation for batch
        const validBatch: string[] = [];

        batch.forEach((serial, idx) => {
          const globalIndex = batchStartIndex + idx;

          // Validate format
          if (!isValidVoucherSerial(serial)) {
            setVoucherCheckResults(prev => {
              if (!prev) return [];
              const updated = [...prev];
              updated[globalIndex] = {
                serialNumber: serial,
                status: "Format Salah",
                isLoading: false,
                isError: true,
                errorMessage: "Serial harus berawalan 350 dan maksimal 12 digit"
              };
              return updated;
            });
            return;
          }

          validBatch.push(serial);
        });

        // Skip API call if no valid serials in batch
        if (validBatch.length === 0) {
          activeWorkers--;
          if (!isCancelledRef.current && currentBatchIndex < batches.length) {
            const nextBatch = batches[currentBatchIndex];
            const nextStartIndex = currentBatchIndex * BATCH_SIZE;
            const nextBatchIndexForToken = globalBatchCounter++;
            currentBatchIndex++;
            processBatch(nextBatch, nextStartIndex, nextBatchIndexForToken);
          }

          if (activeWorkers === 0 && currentBatchIndex >= batches.length) {
            setIsCheckingVoucher(false);
            resolve();
          }
          return;
        }

        try {
          const response = await fetchWithRetry(
            "https://n8n-tg6l96v1wbg0.n8x.biz.id/webhook/voucherSPV1",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token: batchToken, // Use rotated token for this batch
                serials: validBatch,
                timestamp: new Date().toISOString()
              }),
              signal: voucherAbortControllerRef.current?.signal,
            },
            MAX_RETRIES,
            TIMEOUT,
            RETRY_DELAY
          );

          if (!isCancelledRef.current && response.ok) {
            const data = await response.json();

            // Update results for entire batch
            setVoucherCheckResults(prev => {
              if (!prev) return [];
              const updated = [...prev];

              // Parse batch response
              // Response structure: [{ SimInfo: [{voucher1}, {voucher2}, ...] }]
              let results: any[] = [];

              if (Array.isArray(data) && data.length > 0 && data[0].SimInfo && Array.isArray(data[0].SimInfo)) {
                // Extract from SimInfo wrapper
                results = data[0].SimInfo;
              } else if (Array.isArray(data)) {
                results = data;
              } else if (data.results && Array.isArray(data.results)) {
                results = data.results;
              } else if (data.SimInfo && Array.isArray(data.SimInfo)) {
                // Single object with SimInfo array
                results = data.SimInfo;
              } else if (validBatch.length === 1) {
                results = [data];
              }

              results.forEach((item: any, idx: number) => {
                const globalIndex = batchStartIndex + idx;
                const serial = validBatch[idx] || batch[idx];

                // Support both uppercase and lowercase field names
                const validasiStatus = item.validasi || item.Validasi || item.status || "Unknown";
                const serialNumber = item.serialNumber || item.SerialNumber || serial;

                updated[globalIndex] = {
                  serialNumber: serialNumber,
                  status: validasiStatus,
                  isLoading: false,
                  additionalInfo: item
                };
              });

              return updated;
            });
          } else if (!isCancelledRef.current) {
            // Mark entire batch as error
            setVoucherCheckResults(prev => {
              if (!prev) return [];
              const updated = [...prev];
              validBatch.forEach((serial, idx) => {
                updated[batchStartIndex + idx] = {
                  serialNumber: serial,
                  status: "Error",
                  isLoading: false,
                  isError: true,
                  errorMessage: `Batch Error: HTTP ${response.status}`
                };
              });
              return updated;
            });
          }
        } catch (error: any) {
          if (!isCancelledRef.current) {
            let errorMsg = "Network Error";

            if (error.name === 'AbortError') {
              errorMsg = "Request Timeout (10s)";
            } else if (error.message?.includes('Failed to fetch')) {
              errorMsg = "Connection Failed";
            } else if (error.message?.includes('NetworkError')) {
              errorMsg = "Network Error (Check Internet)";
            }

            setVoucherCheckResults(prev => {
              if (!prev) return [];
              const updated = [...prev];
              validBatch.forEach((serial, idx) => {
                updated[batchStartIndex + idx] = {
                  serialNumber: serial,
                  status: "Error",
                  isLoading: false,
                  isError: true,
                  errorMessage: errorMsg
                };
              });
              return updated;
            });
          }
        } finally {
          activeWorkers--;

          if (!isCancelledRef.current && currentBatchIndex < batches.length) {
            const nextBatch = batches[currentBatchIndex];
            const nextStartIndex = currentBatchIndex * BATCH_SIZE;
            const nextBatchIndexForToken = globalBatchCounter++;
            currentBatchIndex++;
            processBatch(nextBatch, nextStartIndex, nextBatchIndexForToken);
          }

          if (activeWorkers === 0 && currentBatchIndex >= batches.length) {
            setIsCheckingVoucher(false);
            resolve();
          }
        }
      };

      // Start initial batch workers
      const initialBatches = Math.min(CONCURRENCY, batches.length);
      for (let i = 0; i < initialBatches; i++) {
        processBatch(batches[i], i * BATCH_SIZE, globalBatchCounter++);
        currentBatchIndex++;
      }

      // Handle empty input
      if (batches.length === 0) {
        setIsCheckingVoucher(false);
        resolve();
      }
    });
  };

  const handleCheckVoucherNow = useCallback(() => {
    if (!token || validTokens.length === 0) {
      setIsTokenModalOpen(true);
      return;
    }

    let serials: string[] = [];

    // Collect serials from all input rows
    for (const row of voucherInputRows) {
      if (row.snAwal.trim() && row.snAkhir.trim()) {
        // Sequential mode - both fields filled
        const rowSerials = generateSequentialSerials(row.snAwal, row.snAkhir);
        if (rowSerials.length === 0) {
          setVoucherErrorMessage(`Baris dengan SN Awal ${row.snAwal}: SN Awal harus lebih kecil atau sama dengan SN Akhir, dan keduanya harus berupa angka valid.`);
          setErrorRowId(row.id);
          setIsVoucherErrorAlertOpen(true);
          return;
        }
        serials.push(...rowSerials);
      } else if (row.snAwal.trim() && !row.snAkhir.trim()) {
        // Single serial mode - only SN Awal filled
        serials.push(row.snAwal.trim());
      }
      // Skip rows where both are empty
    }

    // Fall back to textarea mode if no rows have data
    if (serials.length === 0 && voucherDescription.trim()) {
      const rawSerials = voucherDescription.split('\n').map(s => s.trim()).filter(s => s);
      serials = Array.from(new Set(rawSerials));
    }

    if (serials.length === 0) {
      return; // No input provided
    }

    // Remove duplicates - ensure unique serial numbers only
    serials = Array.from(new Set(serials));

    if (serials.length > 750) {
      setPendingVoucherSerials(serials);
      setIsVoucherLimitAlertOpen(true);
      return;
    }

    processVoucherSerials(serials);
  }, [token, voucherInputRows, voucherDescription, generateSequentialSerials, processVoucherSerials]);

  const handleProceedWithVoucherLimit = useCallback(() => {
    const limitedSerials = pendingVoucherSerials.slice(0, 750);
    setIsVoucherLimitAlertOpen(false);
    setVoucherDescription(limitedSerials.join('\n'));
    processVoucherSerials(limitedSerials);
  }, [pendingVoucherSerials, processVoucherSerials]);

  const handleCancelVoucher = useCallback(() => {
    isCancelledRef.current = true;
    if (voucherAbortControllerRef.current) {
      voucherAbortControllerRef.current.abort();
    }
    setIsCheckingVoucher(false);
    setVoucherCheckResults(null);
  }, []);

  const handleDownloadVoucherExcel = useCallback(() => {
    if (!voucherCheckResults || voucherCheckResults.length === 0) return;

    // Helper function to safely extract field value with case-insensitive matching
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

    const excelData = voucherCheckResults.map((result, idx) => {
      const info = result.additionalInfo || {};

      // Extract all fields with fallback to camelCase and PascalCase
      const serialNumber = getField(info, 'SerialNumber') !== "-" ? getField(info, 'SerialNumber') :
        getField(info, 'serialNumber') !== "-" ? getField(info, 'serialNumber') :
          result.serialNumber || "-";

      const indukNumber = getField(info, 'IndukNumber') !== "-" ? getField(info, 'IndukNumber') :
        getField(info, 'indukNumber') !== "-" ? getField(info, 'indukNumber') :
          serialNumber;

      const description = getField(info, 'Description') !== "-" ? getField(info, 'Description') :
        getField(info, 'description');

      const unlockDate = getField(info, 'UnlockDate') !== "-" ? getField(info, 'UnlockDate') :
        getField(info, 'unlockDate');

      const expiryDate = getField(info, 'ExpiryDate') !== "-" ? getField(info, 'ExpiryDate') :
        getField(info, 'expiryDate');

      const voucherStatus = getField(info, 'VoucherStatus') !== "-" ? getField(info, 'VoucherStatus') :
        getField(info, 'voucherStatus');

      const topupDate = getField(info, 'TopupDate') !== "-" ? getField(info, 'TopupDate') :
        getField(info, 'topupDate');

      const topupMSISDN = getField(info, 'TopupMSISDN') !== "-" ? getField(info, 'TopupMSISDN') :
        getField(info, 'topupMSISDN');

      const unlockRET = getField(info, 'UnlockRET') !== "-" ? getField(info, 'UnlockRET') :
        getField(info, 'unlockRET');

      return {
        "No": idx + 1,
        "Induk Number": indukNumber,
        "Serial Number": serialNumber,
        "Description": description,
        "Status Validasi": result.status || "-",
        "Voucher Status": voucherStatus,
        "Unlock Date": unlockDate,
        "Expiry Date": expiryDate,
        "Topup Date": topupDate,
        "Topup MSISDN": topupMSISDN,
        "Unlock RET": unlockRET,
        "Error": result.errorMessage || "-"
      };
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hasil Cek Voucher");
    XLSX.writeFile(wb, `hasil-cek-voucher-${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [voucherCheckResults]);


  const handleDownloadExcel = useCallback(() => {
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
  }, [checkResults]);

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
          {/* Tabs - Sticky Header */}
          <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md py-3 -mx-4 px-4 sm:-mx-6 sm:px-6 border-b border-border/10 transition-all">
            <div className="flex gap-3 sm:gap-4">
              <button
                onClick={() => setActiveTab("cek-kartu")}
                className={`flex-1 py-2.5 px-4 rounded-lg font-semibold font-display transition-all select-none text-sm sm:text-base ${activeTab === "cek-kartu"
                  ? "tab-active shadow-lg"
                  : "tab-inactive opacity-70 hover:opacity-100"
                  }`}
              >
                Cek Kartu Perdana
              </button>
              <button
                onClick={() => setActiveTab("cek-voucher")}
                className={`flex-1 py-2.5 px-4 rounded-lg font-semibold font-display transition-all select-none text-sm sm:text-base ${activeTab === "cek-voucher"
                  ? "tab-active shadow-lg"
                  : "tab-inactive opacity-70 hover:opacity-100"
                  }`}
              >
                Cek Voucher
              </button>
            </div>
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

              {/* Sticky Header for Results (Actions + Stats) */}
              {(isChecking || checkResults) && (
                <div className="sticky top-[76px] z-40 bg-background/95 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 border-b border-border/10 space-y-4">
                  {/* Cancel & Download Buttons */}
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

                  {/* Stats & Progress */}
                  {checkResults && (
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
                          {checkResults.filter(r => !r.isLoading && !r.isError && (!r.masa_tenggung || r.masa_tenggung === "N/A" || r.masa_tenggung.trim() === "") && r.status?.toLowerCase() !== "unknown").length} Tidak Aktif
                        </span>
                        <span className="text-xs bg-red-900/40 text-red-500 px-2 py-0.5 rounded-full border border-red-500/50">
                          {checkResults.filter(r => !r.isLoading && (r.isError || r.status?.toLowerCase() === "unknown")).length} Gagal
                        </span>
                      </h4>
                      <Progress
                        value={(checkResults.filter(r => !r.isLoading).length / checkResults.length) * 100}
                        className="w-full sm:flex-1 h-2"
                      />
                    </div>
                  )}
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

              {/* Results List */}
              {checkResults && (
                <div className="mt-6 sm:mt-8 space-y-4">
                  <div className="hidden"></div> {/* Spacer placeholder */}
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
            <div className="space-y-6 animate-fade-in">
              {/* Input Card - Hidden when checking */}
              {!isCheckingVoucher && !voucherCheckResults && (
                <>
                  <div className="card-glass rounded-xl p-4 sm:p-6">
                    <h3 className="text-foreground font-semibold font-display mb-2 select-none">
                      Masukkan Serial Number Voucher
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4 select-none">
                      Bisa cek 1pcs hingga 750pcs. Serial number wajib berawalan 350 dan maks 12 digit:
                    </p>

                    {/* Multiple Input Rows */}
                    <div className="space-y-4">
                      {voucherInputRows.map((row, index) => (
                        <div
                          key={row.id}
                          className="relative bg-background/30 rounded-lg p-3 sm:p-4 border border-border/30"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                            {/* SN Awal (Left) */}
                            <div className="flex flex-col gap-2">
                              <label className="text-foreground font-semibold text-sm select-none">
                                SN Awal
                              </label>
                              <input
                                type="text"
                                value={row.snAwal}
                                onChange={(e) => handleUpdateSnAwal(row.id, e.target.value)}
                                placeholder="350xxxxxxxxx"
                                maxLength={12}
                                className={`input-dark ${errorRowId === row.id ? 'border-2 border-red-500' : ''}`}
                              />
                            </div>

                            {/* SN Akhir (Right) */}
                            <div className="flex flex-col gap-2">
                              <label className="text-foreground font-semibold text-sm select-none">
                                SN Akhir
                              </label>
                              <input
                                type="text"
                                value={row.snAkhir}
                                onChange={(e) => handleUpdateSnAkhir(row.id, e.target.value)}
                                placeholder="350xxxxxxxxx"
                                maxLength={12}
                                className={`input-dark ${errorRowId === row.id ? 'border-2 border-red-500' : ''}`}
                              />
                            </div>
                          </div>

                          {/* Remove button - positioned at top right, only show if more than 1 row */}
                          {voucherInputRows.length > 1 && (
                            <button
                              onClick={() => handleRemoveRow(row.id)}
                              className="absolute top-2 right-2 p-1 rounded-md bg-destructive/20 border border-destructive/50 text-destructive hover:bg-destructive/30 transition-all"
                              title="Hapus baris"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}

                      {/* Add Button - Centered */}
                      <div className="flex justify-center pt-2">
                        <button
                          onClick={handleAddRow}
                          disabled={voucherInputRows.length >= 50}
                          className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 border border-primary/50 hover:bg-primary/30 hover:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-primary/20"
                          title={voucherInputRows.length >= 50 ? "Maksimal 50 baris" : "Tambah baris"}
                        >
                          <img src="/add.png" alt="Add" className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleCheckVoucherNow}
                    disabled={!voucherInputRows.some(row => row.snAwal.trim().length >= 12)}
                    className="w-full btn-gradient py-3 rounded-lg transition-all duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed font-display"
                  >
                    Cek Sekarang
                  </button>
                </>
              )}

              {/* Sticky Header for Results (Actions + Stats) */}
              {(isCheckingVoucher || voucherCheckResults) && (
                <div className="sticky top-[76px] z-40 bg-background/95 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 border-b border-border/10 space-y-4">
                  {/* Cancel & Download Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleCancelVoucher}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-destructive/20 border border-destructive/50 text-destructive hover:bg-destructive/30 transition-all font-display"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      onClick={handleDownloadVoucherExcel}
                      disabled={!voucherCheckResults || voucherCheckResults.some(r => r.isLoading)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30 transition-all font-display disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="w-4 h-4" />
                      Download Excel
                    </button>
                  </div>

                  {/* Stats & Progress */}
                  {voucherCheckResults && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <h4 className="text-foreground font-semibold font-display flex flex-wrap items-center gap-2 shrink-0">
                        Hasil Pengecekan
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                          {voucherCheckResults.filter(r => !r.isLoading).length}/{voucherCheckResults.length} Voucher
                        </span>
                        <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded-full">
                          {voucherCheckResults.filter(r => !r.isLoading && !r.isError && r.status?.toLowerCase() === "injected").length} Injected
                        </span>
                        <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">
                          {voucherCheckResults.filter(r => !r.isLoading && !r.isError && (r.status?.toLowerCase().includes("not") || r.status?.toLowerCase().includes("gagal"))).length} Not Inject
                        </span>
                        <span className="text-xs bg-red-900/40 text-red-500 px-2 py-0.5 rounded-full border border-red-500/50">
                          {voucherCheckResults.filter(r => !r.isLoading && (r.isError || r.status?.toLowerCase() === "unknown")).length} Gagal
                        </span>
                      </h4>
                      <Progress
                        value={(voucherCheckResults.filter(r => !r.isLoading).length / voucherCheckResults.length) * 100}
                        className="w-full sm:flex-1 h-2"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Results List */}
              {voucherCheckResults && (
                <div className="mt-6 sm:mt-8 space-y-4">
                  <div className="hidden"></div> {/* Spacer placeholder */}
                  <div className="grid gap-4">
                    {voucherCheckResults.map((result) => (
                      <VoucherCheckResultCard key={result.serialNumber} result={result} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Token Modal */}
      <TokenModal
        isOpen={isTokenModalOpen}
        onOpenChange={setIsTokenModalOpen}
        onSaveToken={(tokenInput, validTokensArray) => {
          setToken(tokenInput);
          setValidTokens(validTokensArray);
          toast.success(`Token tersimpan! ${validTokensArray.length} token valid siap digunakan.`);
        }}
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

      {/* Voucher Limit Warning Dialog */}
      <AlertDialog open={isVoucherLimitAlertOpen} onOpenChange={setIsVoucherLimitAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Maksimal input 750 voucher</AlertDialogTitle>
            <AlertDialogDescription>
              Jumlah serial voucher yang Anda inputkan melebihi batas 750. Apakah Anda ingin tetap melanjutkan proses untuk 750 voucher saja?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsVoucherLimitAlertOpen(false)}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleProceedWithVoucherLimit}>
              Ya, Proses 750 Voucher
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Voucher Validation Error Dialog */}
      <AlertDialog open={isVoucherErrorAlertOpen} onOpenChange={setIsVoucherErrorAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kesalahan Input Serial Number</AlertDialogTitle>
            <AlertDialogDescription>
              {voucherErrorMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => {
              setIsVoucherErrorAlertOpen(false);
              // Keep errorRowId to maintain red border until user fixes it
            }}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
