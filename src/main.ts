// For more information, see https://crawlee.dev/
import { PlaywrightCrawler, Dataset } from 'crawlee'

import { router } from './routes'

const startUrls = ['https://thuvienphapluat.vn']

const crawler = new PlaywrightCrawler({
  headless: true,
  requestHandler: router,
  // maxConcurrency: 10,
  // Comment this option to scrape the full website.
  // maxRequestsPerCrawl: 10,
})

await crawler.run(startUrls)
