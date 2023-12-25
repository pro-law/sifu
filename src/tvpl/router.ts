import { CrawlingContext, createPlaywrightRouter, sleep } from 'crawlee'
import { verifySignedIn } from './verify-signed-in'
import { Page } from 'playwright'
import { Document, RelatedDocument } from './types'
import path from 'path'
import { mkdirSync, writeFileSync } from 'fs'
import Turndown from 'turndown'
import numeral from 'numeral'
import { solveCaptcha } from '../helpers/captcha'

const startUrls = ['https://thuvienphapluat.vn']
const tvplRouter = createPlaywrightRouter()

tvplRouter.addDefaultHandler(async ({ enqueueLinks, log }) => {
  log.info(`Starting TVPL crawler...`)

  await enqueueLinks({
    // urls: ['https://thuvienphapluat.vn/page/tim-van-ban.aspx'],
    urls: [
      'https://thuvienphapluat.vn/page/tim-van-ban.aspx?keyword=Hi%E1%BA%BFn%20ph%C3%A1p', // Hien phap
      'https://thuvienphapluat.vn/page/tim-van-ban.aspx?keyword=luat', // Luat
      'https://thuvienphapluat.vn/page/tim-van-ban.aspx?keyword=ngh%E1%BB%8B%20%C4%91%E1%BB%8Bnh', // Nghi dinh
      'https://thuvienphapluat.vn/page/tim-van-ban.aspx?keyword=th%C3%B4ng%20t%C6%B0', // Thong tu
      'https://thuvienphapluat.vn/page/tim-van-ban.aspx?keyword=nghi%20quyet', // Nghi quyet
      'https://thuvienphapluat.vn/page/tim-van-ban.aspx?keyword=chi%20thi&match=True&area=0', // Chi thi
      'https://thuvienphapluat.vn/page/tim-van-ban.aspx?keyword=sac%20lenh', // Sac lenh
      'https://thuvienphapluat.vn/page/tim-van-ban.aspx?keyword=phap%20lenh&area=0', // Phap lenh
    ],
    label: 'list',
  })
})

tvplRouter.addHandler('list', async ({ request, enqueueLinks, log }) => {
  log.info(`Enqueuing document list...`, { url: request.loadedUrl })

  await enqueueLinks({
    globs: ['https://thuvienphapluat.vn/van-ban/*/*.aspx'],
    label: 'detail',
  })

  log.info(`Enqueuing next pages...`)

  await enqueueLinks({
    selector: '.cmPager > a',
    label: 'list',
  })
})

tvplRouter.addHandler(
  'detail',
  async ({ request, page, log, enqueueLinks }) => {
    const start = Date.now()

    await verifySignedIn({ page, log })

    let title = await page.title()

    if (
      title === 'THƯ VIỆN PHÁP LUẬT - Captcha' ||
      title === 'THƯ VIỆN PHÁP LUẬT _ Tra cứu, Nắm bắt Pháp Luật Việt Nam' ||
      request.loadedUrl?.includes('checkvb.aspx')
    ) {
      log.warning('Captcha detected')
      const buffer = await page.screenshot({
        clip: {
          x: 0,
          y: 134,
          height: 70,
          width: page.viewportSize()?.width || 1920,
        },
        path: 'captcha.png',
      })
      const base64 = buffer.toString('base64')

      const solved = await solveCaptcha(base64)
      log.info(`Solved: ${solved}`)

      if (!solved) {
        throw new Error('Captcha not solved')
      }

      await page.fill('#ctl00_Content_txtSecCode', solved)
      await page.press('#ctl00_Content_txtSecCode', 'Enter')
      await sleep(1000)
    }

    title = await page.title()

    log.info(`👀 [#${request.retryCount}] ${title}`)

    // Extract document properties from the table in tab "Lược đồ"
    await page.click('#ctl00_Content_ctl00_spLuocDo', { force: true })
    await page.waitForSelector('#viewingDocument', {
      timeout: 10000,
      state: 'attached',
    })

    const documentTitle = await page.$eval(
      '#viewingDocument > div:nth-child(1)',
      (el) => el.textContent?.trim(),
    )

    const propertiesArr = await page.$$eval(
      '#viewingDocument > .att',
      (els) => {
        const properties = els.map((el: any) => {
          const key = el
            .querySelector('div:nth-child(1)')
            ?.textContent?.trim()
            .replace(/:$/, '')
          const value = el
            .querySelector('div:nth-child(2)')
            ?.textContent?.trim()

          return { key, value }
        })

        return properties
      },
    )
    const properties = convertPropertiesToObjectWithEnglishKeys(propertiesArr)

    const notes = await page.$eval(
      '#viewingDocument > div:last-child',
      (el) => {
        const content = el.textContent?.trim()
        if (content?.includes('Ghi chú:')) {
          return content.replace('Ghi chú:', '').trim()
        }
        return ''
      },
    )

    // Get all related documents
    const guidedDocuments = await getRelatedDocuments({
      page,
      selector: '#guidedDocument',
      enqueueLinks,
      log,
    })
    const consolidatingDocuments = await getRelatedDocuments({
      page,
      selector: '#DuocHopNhatDocument',
      enqueueLinks,
      log,
    })
    const amendedDocuments = await getRelatedDocuments({
      page,
      selector: '#amendedDocument',
      enqueueLinks,
      log,
    })
    const rectifiedDocuments = await getRelatedDocuments({
      page,
      selector: '#correctedDocument',
      enqueueLinks,
      log,
    })
    const supersededDocuments = await getRelatedDocuments({
      page,
      selector: '#replacedDocument',
      enqueueLinks,
      log,
    })
    const referredDocuments = await getRelatedDocuments({
      page,
      selector: '#referentialDocument',
      enqueueLinks,
      log,
    })
    const influentialDocuments = await getRelatedDocuments({
      page,
      selector: '#basisDocument',
      enqueueLinks,
      log,
    })
    const guidingDocuments = await getRelatedDocuments({
      page,
      selector: '#guideDocument',
      enqueueLinks,
      log,
    })
    const consolidatedDocuments = await getRelatedDocuments({
      page,
      selector: '#HopNhatDocument',
      enqueueLinks,
      log,
    })
    const amendingDocuments = await getRelatedDocuments({
      page,
      selector: '#amendDocument',
      enqueueLinks,
      log,
    })
    const rectifyingDocuments = await getRelatedDocuments({
      page,
      selector: '#correctingDocument',
      enqueueLinks,
      log,
    })
    const supersedingDocuments = await getRelatedDocuments({
      page,
      selector: '#replaceDocument',
      enqueueLinks,
      log,
    })
    const relevantDocuments = await getRelatedDocuments({
      page,
      selector: '#contentConnection',
      enqueueLinks,
      log,
    })

    // Get document content from the tab "Nội dung"
    try {
      await page.waitForSelector('#ctl00_Content_ctl00_divNoiDung', {
        timeout: 10000,
        state: 'attached',
      })
      await page.click('#ctl00_Content_ctl00_divNoiDung', { force: true })
    } catch (error) {
      log.warning(`Cannot click tab "Nội dung". Trying to refresh page...`)
      await page.reload()
    }

    await page.waitForSelector('#divContentDoc', {
      timeout: 10000,
      state: 'attached',
    })

    const htmlContent = await page.$eval(
      '#divContentDoc > .content1 > div > div',
      (el) => el.innerHTML,
    )

    let htmlContentEn = ''

    try {
      // Check if tab "ctl00_Content_ctl00_spTiengAnh" visible
      const isEnglishTabVisible = await page.evaluate(() => {
        const el = document.querySelector(
          '#ctl00_Content_ctl00_spTiengAnh',
        ) as any
        return el?.enable !== 'False'
      })

      if (isEnglishTabVisible) {
        // Get English content from the tab "Tiếng Anh (English)"
        await page.click('#ctl00_Content_ctl00_spTiengAnh', { force: true })

        await page.waitForSelector('#divContentDoc', {
          timeout: 10000,
          state: 'attached',
        })

        htmlContentEn = await page.$eval(
          '#divContentDoc > .content1 > div > div',
          (el) => el.innerHTML,
        )
      } else {
        log.warning(`English content is not available`)
      }
    } catch {}

    const doc: Document = {
      title: documentTitle!,
      notes,
      guidedDocuments,
      consolidatingDocuments,
      amendedDocuments,
      rectifiedDocuments,
      supersededDocuments,
      referredDocuments,
      influentialDocuments,
      guidingDocuments,
      consolidatedDocuments,
      amendingDocuments,
      rectifyingDocuments,
      supersedingDocuments,
      relevantDocuments,
      ...(properties as any),
      htmlContent,
      mdContent: contentToMarkdown(htmlContent),
      htmlContentEn,
      mdContentEn: contentToMarkdown(htmlContentEn),
    }

    await saveDocument(doc)

    log.info(
      `✅ [#${request.retryCount}][${numeral(
        (Date.now() - start) / 1000,
      ).format('00:00')}] ${title}`,
    )
  },
)

async function getRelatedDocuments({
  page,
  selector,
  enqueueLinks,
  log,
}: {
  page: Page
  selector: string
  enqueueLinks: CrawlingContext['enqueueLinks']
  log: CrawlingContext['log']
}) {
  const documents = await page.$$eval(`${selector} div.dgc`, (els) => {
    const documents = els.map((el) => {
      // First child
      const url = el.querySelector('div:nth-child(1) a')?.getAttribute('href')
      const title = el
        .querySelector(
          'div:nth-child(2) div[style="background-color: #FFFBF4;font-weight: bold;"]',
        )
        ?.textContent?.trim()

      const propertyEls =
        el
          .querySelector('div:nth-child(2) > div > div')
          ?.querySelectorAll('div') ?? []
      const properties = Array.from(propertyEls)
        .map((propertyEl) => {
          const key = propertyEl
            .querySelector('div:nth-child(1)')
            ?.textContent?.trim()
            ?.replace(/:$/, '')
          const value = propertyEl
            .querySelector('div:nth-child(2)')
            ?.textContent?.trim()

          return { key, value }
        })
        .filter((property) => property.key !== undefined) as {
        key: string
        value: string
      }[]

      return { title, url, properties }
    })

    return documents
  })

  const originalTitle = await page.title()

  if (documents.length) {
    log.info(
      `🔗 Found ${documents.length} ${selector} documents of ${originalTitle}`,
    )
  }

  // Convert properties to object with English keys
  return documents.map((document) => {
    if (document.url) {
      enqueueLinks?.({
        urls: [document.url],
        label: 'detail',
      })
    }

    return {
      title: document.title!,
      ...convertPropertiesToObjectWithEnglishKeys(document.properties),
    } as RelatedDocument
  })
}

function convertPropertiesToObjectWithEnglishKeys(propertiesArr: any[]) {
  const propKeysMap: Record<string, string> = {
    'Số hiệu': 'id',
    'Loại văn bản': 'legislationType',
    'Lĩnh vực, ngành': 'categories',
    'Nơi ban hành': 'organization',
    'Người ký': 'signers',
    'Số công báo': 'gazetteNumber',
    'Ngày ban hành': 'issuedDate',
    'Ngày đăng': 'gazetteDate',
    'Ngày hiệu lực': 'effectiveDate',
    'Tình trạng': 'status',
  }
  const properties: Record<string, string> = {}

  for (const property of propertiesArr) {
    const key = propKeysMap[property.key]

    if (!key) {
      continue
    }

    let value = property.value

    if (key === 'categories') {
      value = value.split(',').map((category: string) => category.trim())
    } else if (key === 'signers') {
      value = value.split(',').map((signer: string) => signer.trim())
    } else if (
      key === 'issuedDate' ||
      key === 'effectiveDate' ||
      key === 'gazetteDate'
    ) {
      // dd/mm/yyyy -> yyyy-mm-dd
      value = value.split('/').reverse().join('-')
    }

    properties[key] = value
  }

  return properties
}

function contentToMarkdown(content: string) {
  if (!content) {
    return ''
  }
  const turndownService = new Turndown()
  return turndownService.turndown(content)
}

async function saveDocument(document: Document) {
  const fileDir = path.join(
    process.cwd(),
    'documents',
    document.organization ?? 'unknown',
    document.legislationType ?? 'unknown',
  )
  const fileName = `${document.id.replace(/\//g, '_')}.json`
  const filePath = path.join(fileDir, fileName)

  mkdirSync(fileDir, { recursive: true })
  writeFileSync(filePath, JSON.stringify(document, null, 2))
}

export { tvplRouter, startUrls }
