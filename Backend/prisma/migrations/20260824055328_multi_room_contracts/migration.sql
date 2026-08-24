-- CreateTable
CREATE TABLE "contract_rooms" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,

    CONSTRAINT "contract_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contract_rooms_room_id_idx" ON "contract_rooms"("room_id");

-- CreateIndex
CREATE UNIQUE INDEX "contract_rooms_contract_id_room_id_key" ON "contract_rooms"("contract_id", "room_id");

-- AddForeignKey
ALTER TABLE "contract_rooms" ADD CONSTRAINT "contract_rooms_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_rooms" ADD CONSTRAINT "contract_rooms_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: every existing contract's current (single) room becomes its first
-- ContractRoom row, so the join table is complete for legacy data.
INSERT INTO "contract_rooms" ("id", "contract_id", "room_id")
SELECT gen_random_uuid()::text, "id", "room_id" FROM "contracts";
