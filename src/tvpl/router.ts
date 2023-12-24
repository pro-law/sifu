import { createPlaywrightRouter, sleep } from 'crawlee'
import { verifySignedIn } from './verify-signed-in'
import { Page } from 'playwright'
import { Document, RelatedDocument } from './types'
import { fileURLToPath } from 'url'
import path from 'path'
import { mkdirSync, writeFileSync } from 'fs'
import Turndown from 'turndown'

const startUrls = ['https://thuvienphapluat.vn']
const tvplRouter = createPlaywrightRouter()

tvplRouter.addDefaultHandler(async ({ enqueueLinks, log }) => {
  log.info(`Starting TVPL crawler...`)

  await enqueueLinks({
    // urls: ['https://thuvienphapluat.vn/page/tim-van-ban.aspx'],
    urls: [
      'https://thuvienphapluat.vn/page/tim-van-ban.aspx?keyword=luat', // Luat
      // 'https://thuvienphapluat.vn/page/tim-van-ban.aspx?keyword=ngh%E1%BB%8B%20%C4%91%E1%BB%8Bnh', // Nghi dinh
      // 'https://thuvienphapluat.vn/page/tim-van-ban.aspx?keyword=th%C3%B4ng%20t%C6%B0' // Thong tu
    ],
    label: 'list',
  })
  // await enqueueLinks({
  //   urls: [
  //     'https://thuvienphapluat.vn/en/van-ban/Doanh-nghiep/Luat-Dau-tu-so-61-2020-QH14-321051.aspx',
  //   ],
  //   label: 'detail',
  // })
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

tvplRouter.addHandler('detail', async ({ request, page, log, session }) => {
  await verifySignedIn({ page, log })

  const title = await page.title()

  if (
    title === 'THƯ VIỆN PHÁP LUẬT _ Tra cứu, Nắm bắt Pháp Luật Việt Nam' ||
    request.loadedUrl?.includes('checkvb.aspx')
  ) {
    session?.retire()
    await sleep(1000)

    throw new Error('Captcha detected')
  }

  log.info(`${title} (${request.retryCount})`)

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

  const propertiesArr = await page.$$eval('#viewingDocument > .att', (els) => {
    const properties = els.map((el: any) => {
      const key = el
        .querySelector('div:nth-child(1)')
        ?.textContent?.trim()
        .replace(/:$/, '')
      const value = el.querySelector('div:nth-child(2)')?.textContent?.trim()

      return { key, value }
    })

    return properties
  })
  const properties = convertPropertiesToObjectWithEnglishKeys(propertiesArr)

  const notes = await page.$eval('#viewingDocument > div:last-child', (el) => {
    const content = el.textContent?.trim()
    if (content?.includes('Ghi chú:')) {
      return content.replace('Ghi chú:', '').trim()
    }
    return ''
  })

  // Get all related documents
  const guidedDocuments = await getRelatedDocuments(page, '#guidedDocument')
  const consolidatingDocuments = await getRelatedDocuments(
    page,
    '#DuocHopNhatDocument',
  )
  const amendedDocuments = await getRelatedDocuments(page, '#amendedDocument')
  const rectifiedDocuments = await getRelatedDocuments(
    page,
    '#correctedDocument',
  )
  const supersededDocuments = await getRelatedDocuments(
    page,
    '#replacedDocument',
  )
  const referredDocuments = await getRelatedDocuments(
    page,
    '#referentialDocument',
  )
  const influentialDocuments = await getRelatedDocuments(page, '#basisDocument')
  const guidingDocuments = await getRelatedDocuments(page, '#guideDocument')
  const consolidatedDocuments = await getRelatedDocuments(
    page,
    '#HopNhatDocument',
  )
  const amendingDocuments = await getRelatedDocuments(page, '#amendDocument')
  const rectifyingDocuments = await getRelatedDocuments(
    page,
    '#correctingDocument',
  )
  const supersedingDocuments = await getRelatedDocuments(
    page,
    '#replaceDocument',
  )
  const relevantDocuments = await getRelatedDocuments(
    page,
    '#contentConnection',
  )

  // Get document content from the tab "Nội dung"
  await page.click('#ctl00_Content_ctl00_divNoiDung', { force: true })

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
})

async function getRelatedDocuments(page: Page, selector: string) {
  const documents = await page.$$eval(`${selector} div.dgc`, (els) => {
    const documents = els.map((el) => {
      // First child
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

      return { title, properties }
    })

    return documents
  })

  // Convert properties to object with English keys
  return documents.map((document) => {
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
