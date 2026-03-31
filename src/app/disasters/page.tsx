import { query } from "@/lib/db";
import DisasterClient, { DisasterEvent } from "@/components/DisasterClient";

export const dynamic = "force-dynamic";

async function getDisasterData(): Promise<DisasterEvent[]> {
  try {
    const res = await query<DisasterEvent>(
      `SELECT * FROM disaster_events
       ORDER BY published_at DESC NULLS LAST
       LIMIT 100;`,
    );
    return res.rows;
  } catch (error) {
    console.warn("Failed to fetch disaster data. Have you ran the schema migration?", error);
    return [];
  }
}

export default async function DisastersPage() {
  const disasters = await getDisasterData();

  return <DisasterClient data={disasters} />;
}
