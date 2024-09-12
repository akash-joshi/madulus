/** @param {string} url */
async function getReadingTime(url) {
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
