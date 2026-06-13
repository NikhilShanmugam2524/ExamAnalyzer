"use client";

/**
 * CSV bulk import (admin). Parses the file with papaparse, validates every row
 * with the SHARED rules (so the preview matches the server), shows a per-row
 * error preview, and only on confirm calls the server action — which
 * RE-VALIDATES authoritatively and inserts the valid rows with `centre_id` from
 * the session. Optionally accepts the same columns from an .xlsx is out of
 * scope here; CSV is the core path.
 */

import { useRef, useState, useTransition } from "react";
import Papa from "papaparse";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileUp,
  Loader2,
  UploadCloud,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  CSV_COLUMNS,
  csvTemplate,
  validateRow,
  type RawRow,
} from "@/lib/questions/validate";
import { importQuestions, type ImportResult } from "@/app/admin/questions/actions";

type Preview = {
  rawRows: RawRow[];
  rows: { line: number; ok: boolean; errors: string[]; summary: string }[];
  validCount: number;
  missingColumns: string[];
};

export function CsvImport() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, startTransition] = useTransition();

  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "DriveScore-questions-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setPreview(null);
    setResult(null);
    setParseError(null);
    setFileName(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onFile = (file: File) => {
    setResult(null);
    setParseError(null);
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (res) => {
        const rawRows = (res.data ?? []) as RawRow[];
        if (rawRows.length === 0) {
          setParseError("That file has no data rows.");
          setPreview(null);
          return;
        }
        const fields = (res.meta.fields ?? []).map((f) => f.toLowerCase());
        const missingColumns = CSV_COLUMNS.filter((c) => !fields.includes(c));

        let validCount = 0;
        const rows = rawRows.map((raw, i) => {
          const r = validateRow(raw);
          if (r.ok) validCount += 1;
          const summary = [raw.subject, raw.chapter, raw.question_text]
            .map((x) => (x == null ? "" : String(x)))
            .filter(Boolean)
            .join(" · ")
            .slice(0, 70);
          return {
            line: i + 1,
            ok: r.ok,
            errors: r.ok ? [] : r.errors,
            summary: summary || "(empty row)",
          };
        });
        setPreview({ rawRows, rows, validCount, missingColumns });
      },
      error: (err) => {
        setParseError(err.message);
        setPreview(null);
      },
    });
  };

  const confirmImport = () => {
    if (!preview) return;
    startTransition(async () => {
      const res = await importQuestions(preview.rawRows);
      setResult(res);
      setPreview(null);
      setFileName(null);
      if (fileRef.current) fileRef.current.value = "";
      if (res.imported > 0) router.refresh();
    });
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-semibold text-ink">Bulk import (CSV)</h2>
          <p className="mt-0.5 text-xs text-ink/55">
            Upload many questions at once. Use the template so the columns match.
          </p>
        </div>
        <button onClick={downloadTemplate} className="btn-ghost shrink-0 px-3 py-2 text-xs">
          <Download className="h-3.5 w-3.5" />
          Template
        </button>
      </div>

      <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-black/15 bg-black/[0.02] px-4 py-3 text-sm text-ink/70 transition hover:border-teal/50 hover:bg-teal/[0.03]">
        <FileUp className="h-5 w-5 text-teal-deep" />
        <span className="flex-1 truncate">
          {fileName ?? "Choose a .csv file…"}
        </span>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
      </label>

      {parseError && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {parseError}
        </p>
      )}

      {/* ── Preview ── */}
      {preview && (
        <div className="mt-4">
          {preview.missingColumns.length > 0 && (
            <p className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Missing expected column(s): {preview.missingColumns.join(", ")}. Rows
                referencing them will be flagged below.
              </span>
            </p>
          )}

          <div className="mb-2 flex items-center gap-3 text-sm">
            <span className="pill bg-emerald-50 text-emerald-700">
              {preview.validCount} valid
            </span>
            <span className="pill bg-rose-50 text-rose-700">
              {preview.rows.length - preview.validCount} with errors
            </span>
            <span className="text-xs text-ink/45">{preview.rows.length} rows total</span>
          </div>

          <div className="max-h-72 overflow-auto rounded-xl border border-black/[0.06]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-white/95 text-ink/50">
                <tr>
                  <th className="px-3 py-2 font-semibold">#</th>
                  <th className="px-3 py-2 font-semibold">Row</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05]">
                {preview.rows.map((r) => (
                  <tr key={r.line} className={r.ok ? "" : "bg-rose-50/40"}>
                    <td className="px-3 py-2 align-top tabular-nums text-ink/45">{r.line}</td>
                    <td className="px-3 py-2 align-top text-ink/80">{r.summary}</td>
                    <td className="px-3 py-2 align-top">
                      {r.ok ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Valid
                        </span>
                      ) : (
                        <span className="text-rose-600">{r.errors.join("; ")}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={confirmImport}
              disabled={pending || preview.validCount === 0}
              className="btn-primary flex-1"
            >
              {pending ? (
                <>
                  Importing <Loader2 className="h-4 w-4 animate-spin" />
                </>
              ) : (
                <>
                  Import {preview.validCount} valid{" "}
                  {preview.validCount === 1 ? "row" : "rows"}
                  <UploadCloud className="h-4 w-4" />
                </>
              )}
            </button>
            <button onClick={reset} className="btn-ghost px-4 py-3 text-sm">
              Cancel
            </button>
          </div>
          {preview.validCount === 0 && (
            <p className="mt-2 text-center text-[11px] text-ink/45">
              Fix the errors above (or your file) and re-upload.
            </p>
          )}
        </div>
      )}

      {/* ── Result ── */}
      {result && (
        <div className="mt-4 rounded-xl border border-black/[0.06] p-4">
          {result.error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              {result.error}
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                <p className="text-sm font-semibold">
                  Imported {result.imported} of {result.total}
                  {result.skipped.length > 0
                    ? ` — skipped ${result.skipped.length}`
                    : ""}
                </p>
              </div>
              {result.skipped.length > 0 && (
                <div className="mt-3 max-h-48 overflow-auto rounded-lg bg-rose-50/50 p-3 text-xs">
                  <p className="mb-1 font-semibold text-rose-700">Skipped rows:</p>
                  <ul className="space-y-1">
                    {result.skipped.map((s) => (
                      <li key={s.line} className="text-rose-700/90">
                        Row {s.line}: {s.errors.join("; ")}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
          <button onClick={reset} className="btn-ghost mt-3 w-full px-3 py-2 text-xs">
            Import another file
          </button>
        </div>
      )}
    </div>
  );
}
