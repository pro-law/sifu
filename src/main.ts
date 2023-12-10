// For more information, see https://crawlee.dev/
import { PlaywrightCrawler, log } from 'crawlee'

import { router } from './routes'

const startUrls = ['https://thuvienphapluat.vn']

const crawler = new PlaywrightCrawler({
  headless: true,
  requestHandler: router,
  minConcurrency: 10,
  maxConcurrency: 15,
  browserPoolOptions: {
    retireBrowserAfterPageCount: 15,
    useFingerprints: false,
    postLaunchHooks: [
      async (_page, browser) => {
        log.info(`======== [${browser.id}] Browser launched. ========`)
      },
    ],
  },
  // Comment this option to scrape the full website.
  // maxRequestsPerCrawl: 10,
})

await crawler.run(startUrls)
