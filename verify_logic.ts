import { getTimelineData, getDashboardStats } from './src/lib/dashboard';

async function verify() {
  console.log("--- Verifying Dashboard Logic ---");
  try {
    const stats = await getDashboardStats();
    console.log("Stats:", JSON.stringify(stats, null, 2));

    const timeline = await getTimelineData();
    console.log("Timeline entries count:", timeline.length);
    if (timeline.length > 0) {
      console.log("First item:", JSON.stringify(timeline[0], null, 2));
    }
  } catch (error) {
    console.error("Verification failed:", error);
  }
}

verify();
