import { Context, Telegraf } from "telegraf";
import { Readability } from "@mozilla/readability";
import axios from "axios";
import { readingTime } from "reading-time-estimator";
import { JSDOM } from "jsdom";
import { SunriseResponse } from "./types/sunriseTypes";
import { Update } from "telegraf/typings/core/types/typegram";

const moment = require("moment-timezone");

export const ADMINS = process.env.ADMINS.split(",").map((admin) =>
  parseInt(admin)
);

export const OUTSIDERS = process.env.OUTSIDERS.split(",").map((outsider) =>
  parseInt(outsider)
);

export const sunriseFunction = async (
  bot: Telegraf<Context<Update>>,
  ids: number[]
) => {
  try {
    const sunriseResponse = (
      await axios.get<SunriseResponse>(
        `http://dataservice.accuweather.com/forecasts/v1/daily/5day/204843?apikey=euAOzlo4f6QvNgEBzf4dMhLN7cQNTiow&details=true&metric=true`
      )
    ).data;

    const SUNRISE_OFFSET = 1;
    const SLEEP_OFFSET = -9.5;
    const PRETEND_OFFSET = SLEEP_OFFSET - 0.5;

    const message = `Wake up at ${moment
      .tz(
        sunriseResponse.DailyForecasts[1].Sun.EpochRise * 1000,
        "Asia/Kolkata"
      )
      .add(SUNRISE_OFFSET, "hours")
      .format("HH:mm")}
    \nSleep at ${moment
      .tz(
        sunriseResponse.DailyForecasts[1].Sun.EpochRise * 1000,
        "Asia/Kolkata"
      )
      .add(SUNRISE_OFFSET, "hours")
      .add(SLEEP_OFFSET, "hours")
      .format("HH:mm")}   
    \nPretend to sleep at ${moment
      .tz(
        sunriseResponse.DailyForecasts[1].Sun.EpochRise * 1000,
        "Asia/Kolkata"
      )
      .add(SUNRISE_OFFSET, "hours")
      .add(PRETEND_OFFSET, "hours")
      .format("HH:mm")}
    \nStop screens at ${moment
      .tz(
        sunriseResponse.DailyForecasts[1].Sun.EpochRise * 1000,
        "Asia/Kolkata"
      )
      .add(SUNRISE_OFFSET, "hours")
      .add(PRETEND_OFFSET - 1, "hours")
      .format("HH:mm")}
    \nStop Coding at ${moment
      .tz(
        sunriseResponse.DailyForecasts[1].Sun.EpochRise * 1000,
        "Asia/Kolkata"
      )
      .add(SUNRISE_OFFSET, "hours")
      .add(PRETEND_OFFSET - 2, "hours")
      .format("HH:mm")}
    \nSunset at ${moment
      .tz(sunriseResponse.DailyForecasts[1].Sun.EpochSet * 1000, "Asia/Kolkata")
      .format("HH:mm")}
    \nSunrise at ${moment
      .tz(
        sunriseResponse.DailyForecasts[1].Sun.EpochRise * 1000,
        "Asia/Kolkata"
      )
      .format("HH:mm")}
    \nTemperature: ${
      sunriseResponse.DailyForecasts[1].Temperature.Minimum.Value
    } - ${sunriseResponse.DailyForecasts[1].Temperature.Maximum.Value} 
    \nDay: ${sunriseResponse.DailyForecasts[1].Day.LongPhrase}
    \nNight: ${sunriseResponse.DailyForecasts[1].Night.LongPhrase}`;

    for (const id of ids) {
      bot.telegram.sendMessage(id, message);
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
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() - 1);

  const hnResponse = await axios.get(
    `https://hn.algolia.com/api/v1/search?tags=story&numericFilters=created_at_i>${
      currentDate.valueOf() / 1000
    }`
  );

  const relevantArticles = (hnResponse.data as HNApiResponse).hits.slice(0, 6);

  const hnMessages = [];

  for (const hitIndex in relevantArticles) {
    const hit = relevantArticles[hitIndex];

    let returnedData = `${parseInt(hitIndex) + 1}. ${
      hit.title
    }\nhttps://news.ycombinator.com/item?id=${hit.objectID}`;

    if (hit.url) {
      const pageHtml: string | null = await axios
        .get(hit.url, { timeout: 4000 })
        .then((response) => response.data)
        .catch((error) => {
          console.error(error);
          return null;
        });

      if(!pageHtml) {
        continue;
      }

      const doc = new JSDOM(pageHtml, {
        url: hit.url,
      });

      const reader = new Readability(doc.window.document);
      const article = reader.parse();

      if (article.textContent) {
        const length = readingTime(article.textContent).text;
        returnedData = `${returnedData}\n${length}`;
      }
    }

    hnMessages.push(returnedData);
  }

  return `
  Today's top HN stories were:\n
${hnMessages.join("\n\n")}
  `;
};

export const sendHn = async (
  bot: Telegraf<Context<Update>>,
  ids: number[],
  admins: number[]
) => {
  try {
    const message = await generateHNText();

    for (const id of ids) {
      bot.telegram.sendMessage(id, message);
    }
  } catch (error) {
    console.error(error);

    for (const admin of admins) {
      bot.telegram.sendMessage(admin, "HN cron failed:");

      bot.telegram.sendMessage(admin, error);
    }
  }
};

export const callSunrise = (bot: Telegraf<Context<Update>>, db: any) => {
  const CronJob = require("cron").CronJob;
  const job = new CronJob(
    "30 19 * * *",
    function () {
      sunriseFunction(bot, ADMINS);
      sendHn(
        bot,
        [...ADMINS, ...OUTSIDERS, ...db.get("subscribers").value()],
        ADMINS
      );
    },
    null,
    true,
    "Asia/Kolkata"
  );
  job.start();
};
