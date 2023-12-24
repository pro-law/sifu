import * as path from 'path'
import * as fs from 'fs'
import { fileURLToPath } from 'url'

import { createPlaywrightRouter } from 'crawlee'

export const router = createPlaywrightRouter()

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const normalizeContent = (content: string) => {
  // Replace line breaks surrounded by letters (word characters) with a space (removes in-sentence line breaks)
  let newText = content.replace(/(\w)\s*\n\s*(\w)/g, '$1 $2')

  // Replace multiple continuous line breaks (including spaces/tabs between line breaks) with a single line break
  newText = newText.replace(/(\n\s*){2,}/g, '\n')

  // Replace multiple continuous spaces with a single space
  newText = newText.replace(/ +/g, ' ')

  return newText
}

router.addDefaultHandler(async ({ enqueueLinks, log }) => {
  log.info(`Starting TVPL crawler...`)

  await enqueueLinks({
    // urls: ['https://thuvienphapluat.vn/page/tim-van-ban.aspx'],
    urls: [
      'https://thuvienphapluat.vn/page/tim-van-ban.aspx?keyword=luat',
      'https://thuvienphapluat.vn/page/tim-van-ban.aspx?keyword=ngh%E1%BB%8B%20%C4%91%E1%BB%8Bnh',
      'https://thuvienphapluat.vn/page/tim-van-ban.aspx?keyword=th%C3%B4ng%20t%C6%B0'
    ],
    label: 'list',
  })
})

router.addHandler('list', async ({ request, enqueueLinks, log }) => {
  log.info(`Enqueuing document list...`, { url: request.loadedUrl })

  await enqueueLinks({
    // Eg: https://thuvienphapluat.vn/van-ban/Thuong-mai/Thong-bao-506-TB-VPCP-2023-ket-luan-trien-khai-Nghi-quyet-98-2023-QH15-phat-trien-Ho-Chi-Minh-589571.aspx
    globs: ['https://thuvienphapluat.vn/van-ban/*/*.aspx'],
    label: 'detail',
  })

  log.info(`Enqueuing next pages...`)

  await enqueueLinks({
    selector: '.cmPager > a',
    label: 'list',
  })
})

router.addHandler('detail', async ({ request, page, log, session }) => {
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

  // Get document properties from the table in tab "Thuộc tính"
  await page.click('#ctl00_Content_ctl00_spThuocTinh', { force: true })
  await page.waitForSelector('#divThuocTinh', {
    timeout: 10000,
    state: 'attached',
  })

  const table = await page.$('#divThuocTinh > table')
  const rows = (await table?.$$('tr')) ?? []
  const properties: Record<string, string> = {}

  for (const row of rows) {
    const cells = await row.$$('td')
    const textCells = (
      await Promise.all(
        cells.map(async (cell) => {
          return (await cell.innerText()).trim()
        }),
      )
    ).filter((text) => text !== '')

    while (textCells.length > 1) {
      const key = textCells[0].replace(/:$/, '')
      const value = textCells[1]
      properties[key] = value
      textCells.splice(0, 2)
    }
  }

  // Get document content from the tab "Nội dung"
  await page.click('#ctl00_Content_ctl00_spNoiDung', { force: true })
  await page.waitForSelector('#divContentDoc', {
    timeout: 10000,
    state: 'attached',
  })
  const rawContent = await page.$eval(
    '#divContentDoc > .content1',
    (el) => el.textContent?.trim() ?? '',
  )
  const content = normalizeContent(rawContent)

  // Skip documents if it's not updated
  if (
    content.includes(
      'Văn bản này đang cập nhật Nội dung => Bạn vui lòng "Tải về" để xem',
    )
  ) {
    log.info(`Document is not updated. Skipping...`)
    return
  }

  // Store the document content to a file
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const fileDir = path.join(
    __dirname,
    '..',
    'documents',
    properties['Nơi ban hành'] ?? 'unknown',
    properties['Loại văn bản'] ?? 'unknown',
  )
  const fileName = `${properties['Số hiệu'].replace(/\//g, '_')}.json`
  const filePath = path.join(fileDir, fileName)

  fs.mkdirSync(fileDir, { recursive: true })
  fs.writeFileSync(
    filePath,
    JSON.stringify(
      {
        url: request.loadedUrl,
        title,
        properties,
        content,
      },
      null,
      2,
    ),
  )
})
