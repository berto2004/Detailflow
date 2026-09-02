import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  features,
  planFeatures,
  plans,
  subscriptions,
} from "@/db/schema";

export type Entitlement = {
  featureCode: string;
  featureType: "boolean" | "limit";
  enabled: boolean;
  limitValue: number | null;
  unlimited: boolean;
};

export async function getOrganizationPlan(
  organizationId: string,
) {
  const db = getDb();

  const result = await db
    .select({
      subscriptionId: subscriptions.id,
      subscriptionStatus: subscriptions.status,
      planId: plans.id,
      planCode: plans.code,
      planName: plans.name,
    })
    .from(subscriptions)
    .innerJoin(
      plans,
      eq(subscriptions.planId, plans.id),
    )
    .where(
      eq(
        subscriptions.organizationId,
        organizationId,
      ),
    )
    .limit(1);

  return result[0] ?? null;
}

export async function getEntitlement(
  organizationId: string,
  featureCode: string,
): Promise<Entitlement | null> {
  const db = getDb();

  const result = await db
    .select({
      featureCode: features.code,
      featureType: features.type,
      enabled: planFeatures.enabled,
      limitValue: planFeatures.limitValue,
      unlimited: planFeatures.unlimited,
    })
    .from(subscriptions)
    .innerJoin(
      planFeatures,
      eq(
        subscriptions.planId,
        planFeatures.planId,
      ),
    )
    .innerJoin(
      features,
      eq(
        planFeatures.featureId,
        features.id,
      ),
    )
    .where(
      and(
        eq(
          subscriptions.organizationId,
          organizationId,
        ),
        eq(
          features.code,
          featureCode,
        ),
        eq(
          features.active,
          true,
        ),
      ),
    )
    .limit(1);

  if (!result[0]) {
    return null;
  }

  return result[0];
}

export async function canUseFeature(
  organizationId: string,
  featureCode: string,
): Promise<boolean> {
  const entitlement = await getEntitlement(
    organizationId,
    featureCode,
  );

  if (!entitlement) {
    return false;
  }

  if (!entitlement.enabled) {
    return false;
  }

  return true;
}

export async function checkLimit(
  organizationId: string,
  featureCode: string,
  currentUsage: number,
): Promise<boolean> {
  const entitlement = await getEntitlement(
    organizationId,
    featureCode,
  );

  if (!entitlement || !entitlement.enabled) {
    return false;
  }

  if (entitlement.unlimited) {
    return true;
  }

  if (entitlement.limitValue === null) {
    return true;
  }

  return currentUsage < entitlement.limitValue;
}