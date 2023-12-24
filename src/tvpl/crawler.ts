import { PlaywrightCrawler } from 'crawlee'
import { startUrls, tvplRouter } from './router'

const crawler = new PlaywrightCrawler({
  headless: true,
  requestHandler: tvplRouter,
  maxConcurrency: 1,
  launchContext: {
    useIncognitoPages: true,
    launchOptions: {
      slowMo: 200,
    },
  },
  // Comment this option to scrape the full website.
  maxRequestsPerCrawl: process.env.MAX_REQUESTS_PER_CRAWL
    ? +process.env.MAX_REQUESTS_PER_CRAWL
    : undefined,
  sameDomainDelaySecs: 2,
})

async function crawlTVPL() {
  return crawler.run(startUrls)
}

export { crawlTVPL }
