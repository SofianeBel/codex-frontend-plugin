import { capturePage } from "./capture-page.js";
import { loadConfig, parseArgs, runCommand, stopProcessTree, waitForUrl } from "./lib/config.js";

const options = parseArgs();
const mockupOptions = {
  ...options,
  actual: ".visual-references/home.png"
};
const config = await loadConfig(mockupOptions);
let child;

try {
  child = runCommand(config.appCommand);
  await waitForUrl(config.url, config.captureTimeoutMs);
  await capturePage(mockupOptions);
  console.log("Generated .visual-references/home.png");
} finally {
  await stopProcessTree(child);
}
