import axios from "axios";
import { getReadingTime } from "./readingTime";
import { Bot, Context, Api, RawApi } from "grammy";

const moment = require("moment-timezone");

import { SunriseResponse } from "../types/sunriseTypes";

export const ADMINS = process.env?.ADMINS?.split(",").map((admin) =>
  parseInt(admin)
) ?? [];

export const OUTSIDERS = process.env?.OUTSIDERS?.split(",").map((outsider) =>
  parseInt(outsider)
) ?? [];

// Friday reminder links - add more links here as needed
const FRIDAY_REMINDER_LINKS = [
  { label: "CGI Manchester", url: "https://www.cgimanchester.gov.in/list/MQ,," },
  { label: "Manchester Startup Events", url: "https://www.perplexity.ai/search/find-me-new-and-upcoming-start-c7WKMHt5TsirmTelKQtDzw#0"}
];

export const sunriseFunction = async (
  bot: Bot<Context, Api<RawApi>>,
  ids: number[]
) => {
  try {
    const sunriseResponse = (
      await axios.get<SunriseResponse>(
        `http://dataservice.accuweather.com/forecasts/v1/daily/5day/328328?apikey=euAOzlo4f6QvNgEBzf4dMhLN7cQNTiow&details=true&metric=true`
      )
    ).data;

    const SUNRISE_OFFSET = 1;
    const SLEEP_OFFSET = -9.5;
    const PRETEND_OFFSET = SLEEP_OFFSET - 0.5;

    const message = `Wake up at ${moment
      .tz(
        sunriseResponse.DailyForecasts[1].Sun.EpochRise * 1000,
        "Europe/London"
      )
      .add(SUNRISE_OFFSET, "hours")
      .format("HH:mm")}
    \nSleep at ${moment
      .tz(
        sunriseResponse.DailyForecasts[1].Sun.EpochRise * 1000,
        "Europe/London"
      )
      .add(SUNRISE_OFFSET, "hours")
      .add(SLEEP_OFFSET, "hours")
      .format("HH:mm")}   
    \nPretend to sleep at ${moment
      .tz(
        sunriseResponse.DailyForecasts[1].Sun.EpochRise * 1000,
        "Europe/London"
      )
      .add(SUNRISE_OFFSET, "hours")
      .add(PRETEND_OFFSET, "hours")
      .format("HH:mm")}
    \nStop screens at ${moment
      .tz(
        sunriseResponse.DailyForecasts[1].Sun.EpochRise * 1000,
        "Europe/London"
      )
      .add(SUNRISE_OFFSET, "hours")
      .add(PRETEND_OFFSET - 1, "hours")
      .format("HH:mm")}
    \nStop Coding at ${moment
      .tz(
        sunriseResponse.DailyForecasts[1].Sun.EpochRise * 1000,
        "Europe/London"
      )
      .add(SUNRISE_OFFSET, "hours")
      .add(PRETEND_OFFSET - 2, "hours")
      .format("HH:mm")}
    \nSunset at ${moment
      .tz(sunriseResponse.DailyForecasts[1].Sun.EpochSet * 1000, "Europe/London")
      .format("HH:mm")}
    \nSunrise at ${moment
      .tz(
        sunriseResponse.DailyForecasts[1].Sun.EpochRise * 1000,
        "Europe/London"
      )
      .format("HH:mm")}
    \nTemperature: ${
      sunriseResponse.DailyForecasts[1].Temperature.Minimum.Value
    } - ${sunriseResponse.DailyForecasts[1].Temperature.Maximum.Value} 
    \nDay: ${sunriseResponse.DailyForecasts[1].Day.LongPhrase}
    \nNight: ${sunriseResponse.DailyForecasts[1].Night.LongPhrase}`;

    for (const id of ids) {
      bot.api.sendMessage(id, message);
    }
  } catch (error) {
    console.error(error);
    console.log("weather call failed");
  }
};

type HNApiResponse = {
  hits: HNHit[];
};

type HNHit = {
  objectID: string;
  title: string;
  url?: string;
};

export const generateHNText = async () => {
  console.log("🔍 Starting HN article search...");
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() - 1);

  console.log(`📅 Fetching articles since: ${currentDate.toISOString()}`);
  const hnResponse = await axios.get(
    `https://hn.algolia.com/api/v1/search?tags=story&numericFilters=created_at_i>${
      currentDate.valueOf() / 1000
    }`
  );

  const relevantArticles = (hnResponse.data as HNApiResponse).hits.slice(0, 6);
  console.log(`📚 Found ${relevantArticles.length} relevant articles`);

  const hnMessages: Array<string> = [];

  for (const hitIndex in relevantArticles) {
    const hit = relevantArticles[hitIndex];
    console.log(`🔗 Processing article ${parseInt(hitIndex) + 1}: ${hit.title}`);

    let returnedData = `${parseInt(hitIndex) + 1}. ${
      hit.title
    }\nhttps://news.ycombinator.com/item?id=${hit.objectID}`;

    if (hit.url) {
      console.log(`⏱️ Getting reading time for: ${hit.url}`);
      const readingTime = await getReadingTime(hit.url);

      if (readingTime) {
        returnedData = `${returnedData}\nReading Time: ${readingTime.text}`;
        console.log(`📖 Reading time: ${readingTime.text}`);
      } else {
        console.log(`⚠️ Could not get reading time for: ${hit.url}`);
      }
    }

    hnMessages.push(returnedData);
  }

  console.log("✅ HN message generation complete");
  return `
  Today's top HN stories were:\n
${hnMessages.join("\n\n")}
  `;
};

export const sendHn = async (
  bot: Bot<Context, Api<RawApi>>,
  ids: number[],
  admins: number[]
) => {
  try {
    console.log("🔄 Generating HackerNews message...");
    const message = await generateHNText();
    console.log("✅ HackerNews message generated successfully");

    console.log(`📨 Sending message to ${ids.length} recipients: ${JSON.stringify(ids)}`);
    for (const id of ids) {
      console.log(`📤 Sending to user ID: ${id}`);
      await bot.api.sendMessage(id, message);
      console.log(`✅ Successfully sent to user ID: ${id}`);
    }
    console.log("✅ All messages sent successfully");
  } catch (error) {
    console.error("❌ Error in HackerNews cron:", error);

    console.log("⚠️ Notifying admin users about the error...");
    for (const id of ids) {
      if (admins.includes(id)) {
        await bot.api.sendMessage(id, `HN cron failed:\n${error}`);
      }
    }
  }
};

export const sendFridayReminder = async (
  bot: Bot<Context, Api<RawApi>>,
  admins: number[]
) => {
  const links = FRIDAY_REMINDER_LINKS.map(
    ({ label, url }) => `[${label}](${url})`
  ).join("\n");

  const message = `🇮🇳 Friday reminder:\n\n${links}`;

  for (const id of admins) {
    await bot.api.sendMessage(id, message, { parse_mode: "Markdown" });
  }
};

export const callSunrise = (bot: Bot<Context, Api<RawApi>>, db: any) => {
  const CronJob = require("cron").CronJob;
  console.log("🕒 Setting up cron job for 18:30 Europe/London time");

  const job = new CronJob(
    "30 18 * * *",
    function () {
      console.log("⏰ Cron job triggered at:", new Date().toISOString());

      // Log subscriber information
      const subscribers = db.get("subscribers").value();
      console.log(`👥 Current subscribers: ${JSON.stringify(subscribers)}`);
      console.log(`👤 ADMINS: ${JSON.stringify(ADMINS)}`);
      console.log(`👥 OUTSIDERS: ${JSON.stringify(OUTSIDERS)}`);

      // Run sunriseFunction with error handling
      console.log("☀️ Starting sunriseFunction...");
      sunriseFunction(bot, ADMINS).catch(error => {
        console.error("❌ Error in sunriseFunction:", error);
        // Notify admins about the error
        for (const id of ADMINS) {
          bot.api.sendMessage(id, `Sunrise function failed:\n${error}`).catch(console.error);
        }
      });

      // Run sendHn independently
      console.log("📰 Starting sendHn function...");
      sendHn(
        bot,
        [...ADMINS, ...OUTSIDERS, ...subscribers],
        ADMINS
      );
    },
    null,
    true,
    "Europe/London"
  );
  job.start();
  console.log("✅ Cron job started successfully");
};

export const callFridayReminder = (bot: Bot<Context, Api<RawApi>>) => {
  const CronJob = require("cron").CronJob;
  console.log("🕒 Setting up Friday reminder cron job for 09:00 Europe/London");

  const job = new CronJob(
    "0 9 * * 5",
    function () {
      console.log("⏰ Friday reminder cron triggered at:", new Date().toISOString());
      sendFridayReminder(bot, ADMINS);
    },
    null,
    true,
    "Europe/London"
  );
  job.start();
  console.log("✅ Friday reminder cron job started successfully");
};
