import { formatDate, formatPHP, formatPeriod } from "@/lib/format";
import type { InvoiceDetail } from "@/lib/api/invoices";

/**
 * Formal, print-only rendering of an invoice. Hidden on screen (`hidden`) and
 * revealed by the browser's print dialog (`print:block`); the app chrome is
 * hidden for print via `print:!hidden` in the app shell, so this is all that
 * lands on the page.
 */
// Derive the effective rate from the stored amounts so the label is always
// accurate — never a hardcoded tax rate.
function pct(part: string, base: string): string {
  const b = Number(base);
  if (!b) return "";
  const r = Math.round((Number(part) / b) * 1000) / 10; // one decimal
  return ` (${r}%)`;
}

export function PrintableInvoice({ invoice }: { invoice: InvoiceDetail }) {
  const vatRateLabel = `VAT${pct(invoice.vatAmount, invoice.basicRentApplied)}`;
  const whtRateLabel = `Less: Withholding tax${pct(invoice.whtAmount, invoice.basicRentApplied)}`;

  return (
    <div className="hidden text-black print:block">
      <div className="mx-auto max-w-[720px] px-2 py-6 font-sans text-[12px] leading-relaxed">
        {/* Letterhead */}
        <div className="flex items-start justify-between border-b-2 border-black pb-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight">JEFARELID</h1>
            <p className="text-[11px] text-gray-600">Building &amp; Room Rental Management</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold tracking-wide">RENTAL INVOICE</h2>
            <p className="text-[11px] text-gray-600">
              No. {invoice.id.slice(-8).toUpperCase()}
            </p>
            <p className="text-[11px] text-gray-600">
              Issued {formatDate(invoice.generatedAt)}
            </p>
          </div>
        </div>

        {/* Bill-to + property */}
        <div className="mt-5 grid grid-cols-2 gap-6">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Billed to
            </p>
            <p className="font-semibold">{invoice.tenant.businessName}</p>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Property
            </p>
            <p>{invoice.buildingName}</p>
            <p>
              {invoice.roomNumbers.length > 1 ? "Rooms " : "Room "}
              {(invoice.roomNumbers.length ? invoice.roomNumbers : [invoice.roomNumber]).join(", ")}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Billing period
            </p>
            <p>{formatPeriod(invoice.periodMonth)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Due date
            </p>
            <p>{formatDate(invoice.dueDate)}</p>
          </div>
        </div>

        {/* Amounts */}
        <table className="mt-6 w-full border-collapse">
          <thead>
            <tr className="border-y border-black text-left">
              <th className="py-2">Description</th>
              <th className="py-2 text-right">Amount (PHP)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="py-1.5">Basic rent</td>
              <td className="py-1.5 text-right tabular-nums">{formatPHP(invoice.basicRentApplied)}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-1.5">{vatRateLabel}</td>
              <td className="py-1.5 text-right tabular-nums">{formatPHP(invoice.vatAmount)}</td>
            </tr>
            <tr className="border-b border-gray-300 font-medium">
              <td className="py-1.5">Gross rent</td>
              <td className="py-1.5 text-right tabular-nums">{formatPHP(invoice.grossRent)}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-1.5">{whtRateLabel}</td>
              <td className="py-1.5 text-right tabular-nums">− {formatPHP(invoice.whtAmount)}</td>
            </tr>
            <tr className="border-b-2 border-black text-base font-bold">
              <td className="py-2">Net receivable</td>
              <td className="py-2 text-right tabular-nums">{formatPHP(invoice.netReceivable)}</td>
            </tr>
          </tbody>
        </table>

        {/* Payment status */}
        <div className="mt-4 flex justify-end">
          <table className="w-[280px] border-collapse">
            <tbody>
              <tr>
                <td className="py-1 text-gray-600">Amount paid</td>
                <td className="py-1 text-right tabular-nums">{formatPHP(invoice.amountPaid)}</td>
              </tr>
              <tr className="border-t border-gray-300 font-semibold">
                <td className="py-1">Balance due</td>
                <td className="py-1 text-right tabular-nums">{formatPHP(invoice.balance)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-8 text-[10px] text-gray-500">
          VAT is computed on the basic rent. Withholding tax (creditable) is applied on the
          rent net of VAT. Please settle on or before the due date.
        </p>

        <div className="mt-10 grid grid-cols-2 gap-10 text-[11px]">
          <div>
            <div className="border-t border-black pt-1">Prepared by</div>
          </div>
          <div>
            <div className="border-t border-black pt-1">Received by</div>
          </div>
        </div>
      </div>
    </div>
  );
}
