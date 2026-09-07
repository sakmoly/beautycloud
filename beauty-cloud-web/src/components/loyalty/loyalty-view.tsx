"use client";

import { useEffect, useState } from "react";

import { callBeautyMethod, getLoyaltyPackages } from "@/lib/api/browser-client";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/states";

export function LoyaltyView() {
  const [packages, setPackages] = useState<unknown[]>([]);
  const [customer, setCustomer] = useState("");
  const [wallet, setWallet] = useState<unknown>(null);
  const [giftCode, setGiftCode] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLoyaltyPackages()
      .then((data) => setPackages(Array.isArray(data) ? data : []))
      .catch(() => setPackages([]))
      .finally(() => setLoading(false));
  }, []);

  async function loadWallet() {
    if (!customer) return;
    setWallet(
      await callBeautyMethod({
        method: "beauty_cloud.api.loyalty.wallet_balance",
        params: { customer },
      }),
    );
  }

  async function validateGiftCard() {
    const result = await callBeautyMethod({
      method: "beauty_cloud.api.loyalty.gift_card_validate",
      params: { gift_card_code: giftCode },
    });
    setWallet(result);
  }

  if (loading) return <LoadingState title="Loading loyalty" />;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Service packages">
        <pre className="overflow-auto rounded bg-black/5 p-3 text-xs">
          {JSON.stringify(packages, null, 2)}
        </pre>
      </Card>
      <Card title="Customer wallet">
        <div className="space-y-3">
          <div>
            <Label htmlFor="customer">Customer</Label>
            <Input id="customer" value={customer} onChange={(e) => setCustomer(e.target.value)} />
          </div>
          <Button onClick={loadWallet}>Load balance</Button>
          <pre className="overflow-auto rounded bg-black/5 p-3 text-xs">
            {JSON.stringify(wallet, null, 2)}
          </pre>
        </div>
      </Card>
      <Card title="Gift card" className="lg:col-span-2">
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Gift card code"
            value={giftCode}
            onChange={(e) => setGiftCode(e.target.value)}
          />
          <Button variant="secondary" onClick={validateGiftCard}>
            Validate
          </Button>
        </div>
      </Card>
    </div>
  );
}
