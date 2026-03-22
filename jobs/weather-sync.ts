import { query } from "../src/lib/db";
import { logger } from "../src/lib/logger";
import { ExternalAPIError } from "../src/lib/errors";

// Example locations to fetch (could be stored in DB if needed)
const LOCATIONS = [
  { id: "london", lat: 51.5074, lon: -0.1278 },
  { id: "new_york", lat: 40.7128, lon: -74.006 },
  { id: "tokyo", lat: 35.6762, lon: 139.6503 },
  { id: "sydney", lat: -33.8688, lon: 151.2093 },
];
const APP_ID = process.env.OPENWEATHER_API_KEY;

async function syncWeather() {
  if (!APP_ID) {
    logger.error("OPENWEATHER_API_KEY is not defined");
    return;
  }

  logger.info("Starting weather sync job");

  for (const loc of LOCATIONS) {
    try {
      const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${loc.lat}&lon=${loc.lon}&exclude=minutely,alerts&units=metric&appid=${APP_ID}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new ExternalAPIError(`OpenWeather API failed ${response.status}`);
      }

      const data = await response.json();
      const current = data.current;

      // Upsert/Insert into weather_snapshots
      await query(
        `
        INSERT INTO weather_snapshots (
          location_id, timestamp, temperature, humidity, pressure, wind_speed, uvi, weather_type, source
        ) VALUES ($1, to_timestamp($2), $3, $4, $5, $6, $7, $8, 'openweathermap')
      `,
        [
          loc.id,
          current.dt,
          current.temp,
          current.humidity,
          current.pressure,
          current.wind_speed,
          current.uvi,
          current.weather[0]?.main || "Unknown",
        ],
      );

      logger.info({ location: loc.id }, "Weather data stored");
    } catch (error) {
      logger.error({ location: loc.id, error }, "Failed to sync weather data");
    }
  }

  logger.info("Weather sync job completed");
}

syncWeather().catch((err) => {
  logger.error({ err }, "Weather sync job unhandled error");
  process.exit(1);
});
