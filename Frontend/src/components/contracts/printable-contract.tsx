import { formatDate, formatPHP } from "@/lib/format";
import type { ContractDetail } from "@/lib/api/contracts";

/**
 * Generated, print-only Contract of Lease. Hidden on screen; revealed by the
 * browser print dialog (`print:block`). The app chrome is hidden for print via
 * `print:!hidden` in the app shell. This is a ready-to-print draft the parties
 * can review and have notarized; final legal wording should be reviewed.
 */
export function PrintableContract({ contract }: { contract: ContractDetail }) {
  const rooms = contract.rooms.length
    ? contract.rooms
    : [{ id: contract.room.id, roomNumber: contract.room.roomNumber, building: contract.room.building }];
  const building = rooms[0]?.building.name ?? contract.room.building.name;
  const roomList = rooms.map((r) => r.roomNumber).join(", ");
  const escPct = (Number(contract.escalationRate) * 100).toFixed(2);

  return (
    <div className="hidden text-black print:block">
      <div className="mx-auto max-w-[720px] px-2 py-6 font-sans text-[12px] leading-relaxed">
        <div className="text-center">
          <h1 className="text-base font-bold">JEFARELID</h1>
          <p className="text-[11px] text-gray-600">Building &amp; Room Rental Management</p>
          <h2 className="mt-4 text-lg font-bold tracking-wide underline">CONTRACT OF LEASE</h2>
        </div>

        <p className="mt-5">
          This Contract of Lease is entered into by and between the <b>LESSOR</b>, the management
          of <b>{building}</b>, and the <b>LESSEE</b>, <b>{contract.tenant.businessName}</b>, under
          the following terms and conditions:
        </p>

        <ol className="mt-4 list-decimal space-y-2 pl-5">
          <li>
            <b>Leased Premises.</b> The Lessor leases to the Lessee the following unit(s) at{" "}
            {building}: <b>{rooms.length > 1 ? "Rooms" : "Room"} {roomList}</b>.
          </li>
          <li>
            <b>Term.</b> The lease shall run from <b>{formatDate(contract.startDate)}</b> to{" "}
            <b>{formatDate(contract.endDate)}</b>, unless sooner terminated or renewed as provided
            herein.
          </li>
          <li>
            <b>Monthly Rent.</b> The basic monthly rent is <b>{formatPHP(contract.basicRent)}</b>.
            Value-Added Tax (VAT) and creditable Withholding Tax (WHT) are applied on each monthly
            invoice in accordance with prevailing BIR regulations.
          </li>
          <li>
            <b>Escalation.</b> The basic rent shall escalate by <b>{escPct}%</b> per annum on the
            lease anniversary ({formatDate(contract.escalationAnchorDate)}).
          </li>
          <li>
            <b>Security Deposit.</b> The Lessee shall post a security deposit of{" "}
            <b>{formatPHP(contract.securityDeposit)}</b>, to be applied in accordance with the terms
            of this lease.
          </li>
          <li>
            <b>Advance Payment.</b> The Lessee has paid an advance payment of{" "}
            <b>{formatPHP(contract.advancePayment)}</b>.
          </li>
          <li>
            <b>Payment Terms.</b> Rent is due on or before the{" "}
            <b>{ordinal(contract.paymentDueDay)}</b> day of each month.
          </li>
        </ol>

        <p className="mt-6">
          IN WITNESS WHEREOF, the parties have signed this Contract of Lease on the date and place
          indicated below.
        </p>

        <div className="mt-12 grid grid-cols-2 gap-10 text-[11px]">
          <div>
            <div className="border-t border-black pt-1 text-center">LESSOR</div>
          </div>
          <div>
            <div className="border-t border-black pt-1 text-center">
              LESSEE — {contract.tenant.businessName}
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-300 pt-3 text-[10px] text-gray-500">
          <p>
            ACKNOWLEDGMENT — Subscribed and sworn to before a Notary Public, this ______ day of
            ____________, 20____, at ____________________, Philippines.
          </p>
          <p className="mt-4">Doc. No. ______; Page No. ______; Book No. ______; Series of 20____.</p>
        </div>
      </div>
    </div>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}
