import { capturePage } from "./capture-page.js";
import { parseArgs } from "./lib/config.js";

const options = parseArgs();
const mockupOptions = {
  ...options,
  actual: ".visual-references/home.png"
};

await capturePage(mockupOptions);
console.log("Generated .visual-references/home.png");
