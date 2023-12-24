// For more information, see https://crawlee.dev/
import { PlaywrightCrawler } from 'crawlee'
import { startUrls, tvplRouter } from './router'

const crawler = new PlaywrightCrawler({
  headless: true,
  requestHandler: tvplRouter,
  sameDomainDelaySecs: 1,
  maxConcurrency: 1,
  browserPoolOptions: {
    useFingerprints: false,
  },
  // Comment this option to scrape the full website.
  // maxRequestsPerCrawl: 10,
})

async function crawlTVPL() {
  return crawler.run(startUrls)
}

export { crawlTVPL }
