import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

/** @param {string} url */
export async function getReadingTime(url) {
	try {
		const response = await fetch(url, { timeout: 4000 });
		if (!response.ok) throw new Error('Failed to fetch');
		const html = await response.text();

		// Simple HTML parsing (not as robust as Readability)
		const textContent = html
			.replace(/<[^>]*>/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();

		// Simple reading time estimation
		const wordsPerMinute = 200;
		const wordCount = textContent.split(/\s+/).length;
		const minutes = Math.ceil(wordCount / wordsPerMinute);

		return { text: `${minutes} min read`, minutes, words: wordCount };
	} catch (error) {
		console.error('Error fetching reading time:', error);
		return null;
	}
}

export const generateHNText = async () => {
	const currentDate = new Date();
	currentDate.setDate(currentDate.getDate() - 1);

	const hnResponse = await fetch(
		`https://hn.algolia.com/api/v1/search?tags=story&numericFilters=created_at_i>${currentDate.valueOf() / 1000}`
	);
	const hnData = await hnResponse.json();

	const relevantArticles = hnData.hits.slice(0, 6);

	/** @type {Array<string>} */
	const hnMessages = [];

	for (const hitIndex in relevantArticles) {
		const hit = relevantArticles[hitIndex];

		let returnedData = `${parseInt(hitIndex) + 1}. ${hit.title}\nhttps://news.ycombinator.com/item?id=${hit.objectID}`;

		if (hit.url) {
			const readingTime = await getReadingTime(hit.url);

			if (readingTime) {
				returnedData = `${returnedData}\nReading Time: ${readingTime.text}`;
			}
		}

		hnMessages.push(returnedData);
	}

	return `
    Today's top HN stories were:\n${hnMessages.join('\n\n')}
    `;
};

export const sunriseFunction = async () => {
	try {
		const response = await fetch(
			'http://dataservice.accuweather.com/forecasts/v1/daily/5day/328328?apikey=euAOzlo4f6QvNgEBzf4dMhLN7cQNTiow&details=true&metric=true'
		);
		const sunriseResponse = await response.json();

		const SUNRISE_OFFSET = 1;
		const SLEEP_OFFSET = -9.5;
		const PRETEND_OFFSET = SLEEP_OFFSET - 0.5;

		const message = `Wake up at ${dayjs(sunriseResponse.DailyForecasts[1].Sun.EpochRise * 1000)
			.tz('Europe/London')
			.add(SUNRISE_OFFSET, 'hour')
			.format('HH:mm')}
      \nSleep at ${dayjs(sunriseResponse.DailyForecasts[1].Sun.EpochRise * 1000)
				.tz('Europe/London')
				.add(SUNRISE_OFFSET, 'hour')
				.add(SLEEP_OFFSET, 'hour')
				.format('HH:mm')}   
      \nPretend to sleep at ${dayjs(sunriseResponse.DailyForecasts[1].Sun.EpochRise * 1000)
				.tz('Europe/London')
				.add(SUNRISE_OFFSET, 'hour')
				.add(PRETEND_OFFSET, 'hour')
				.format('HH:mm')}
      \nStop screens at ${dayjs(sunriseResponse.DailyForecasts[1].Sun.EpochRise * 1000)
				.tz('Europe/London')
				.add(SUNRISE_OFFSET, 'hour')
				.add(PRETEND_OFFSET - 1, 'hour')
				.format('HH:mm')}
      \nStop Coding at ${dayjs(sunriseResponse.DailyForecasts[1].Sun.EpochRise * 1000)
				.tz('Europe/London')
				.add(SUNRISE_OFFSET, 'hour')
				.add(PRETEND_OFFSET - 2, 'hour')
				.format('HH:mm')}
      \nSunset at ${dayjs(sunriseResponse.DailyForecasts[1].Sun.EpochSet * 1000).tz('Europe/London').format('HH:mm')}
      \nSunrise at ${dayjs(sunriseResponse.DailyForecasts[1].Sun.EpochRise * 1000).tz('Europe/London').format('HH:mm')}
      \nTemperature: ${sunriseResponse.DailyForecasts[1].Temperature.Minimum.Value} - ${
			sunriseResponse.DailyForecasts[1].Temperature.Maximum.Value
		} 
      \nDay: ${sunriseResponse.DailyForecasts[1].Day.LongPhrase}
      \nNight: ${sunriseResponse.DailyForecasts[1].Night.LongPhrase}`;

		return message;
	} catch (error) {
		console.error(error);
		return null;
	}
};
