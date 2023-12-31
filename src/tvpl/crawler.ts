import { PlaywrightCrawler } from 'crawlee'
import { startUrls, tvplRouter } from './router'

const crawler = new PlaywrightCrawler({
  headless: true,
  requestHandler: tvplRouter,
  maxConcurrency: +(process.env.MAX_CONCURRENCY || 1),
  // sameDomainDelaySecs: 2,
  launchContext: {
    useIncognitoPages: true,
    launchOptions: {
      slowMo: 100,
    },
  },
  // Comment this option to scrape the full website.
  maxRequestsPerCrawl: process.env.MAX_REQUESTS_PER_CRAWL
    ? +process.env.MAX_REQUESTS_PER_CRAWL
    : undefined,
})

async function crawlTVPL() {
  await crawler.run(startUrls)
  console.log('Finished crawling TVPL. Exiting...')
  process.exit(0)
}

export { crawlTVPL }
