import axios from "axios";
import { getReadingTime } from "./readingTime";
import { Bot, Context, Api, RawApi } from "grammy";

const moment = require("moment-timezone");

import { SunriseResponse } from "../types/sunriseTypes";

export const ADMINS = process.env.ADMINS.split(",").map((admin) =>
  parseInt(admin)
);

export const OUTSIDERS = process.env.OUTSIDERS.split(",").map((outsider) =>
  parseInt(outsider)
);

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
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() - 1);

  const hnResponse = await axios.get(
    `https://hn.algolia.com/api/v1/search?tags=story&numericFilters=created_at_i>${
      currentDate.valueOf() / 1000
    }`
  );

  const relevantArticles = (hnResponse.data as HNApiResponse).hits.slice(0, 6);

  const hnMessages: Array<string> = [];

  for (const hitIndex in relevantArticles) {
    const hit = relevantArticles[hitIndex];

    let returnedData = `${parseInt(hitIndex) + 1}. ${
      hit.title
    }\nhttps://news.ycombinator.com/item?id=${hit.objectID}`;

    if (hit.url) {
      const readingTime = await getReadingTime(hit.url);

      if (readingTime) {
        returnedData = `${returnedData}\nReading Time: ${readingTime.text}`;
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
  bot: Bot<Context, Api<RawApi>>,
  ids: number[],
  admins: number[]
) => {
  try {
    const message = await generateHNText();

    for (const id of ids) {
      bot.api.sendMessage(id, message);
    }
  } catch (error) {
    console.error(error);

    for (const id of ids) {
      if (admins.includes(id)) {
        bot.api.sendMessage(id, `HN cron failed:\n${error}`);
      }
    }
  }
};

export const callSunrise = (bot: Bot<Context, Api<RawApi>>, db: any) => {
  const CronJob = require("cron").CronJob;
  const job = new CronJob(
    "30 18 * * *",
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
    "Europe/London"
  );
  job.start();
};
