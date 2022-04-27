import { generateHNText } from "../src/crons";

const main = async () => {
  console.log(await generateHNText());
};

main();
