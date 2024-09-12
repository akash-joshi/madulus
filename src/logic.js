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