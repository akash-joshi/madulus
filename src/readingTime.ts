import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import axios from "axios";
import { readingTime } from "reading-time-estimator";

export const getReadingTime = async (
  url: string
): Promise<ReturnType<typeof readingTime> | null> => {
  const pageHtml: string | null = await axios
    .get(url, { timeout: 4000 })
    .then((response) => response.data)
    .catch((error) => {
      console.error(error);
      return null;
    });

  if (!pageHtml) {
    return null;
  }

  const doc = new JSDOM(pageHtml, {
    url: url,
  });

  const reader = new Readability(doc.window.document);
  const article = reader.parse();

  return readingTime(article.textContent);
};
