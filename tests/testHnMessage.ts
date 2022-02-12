import { generateHNText } from "../crons";

const main = async () => {
  console.log(await generateHNText());
};

main();
