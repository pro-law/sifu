import { Log, sleep } from 'crawlee'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { Page } from 'playwright'
import { COOKIES_FILE_PATH } from './constants'
import config from '../helpers/config'

async function verifySignedIn({ page, log }: { page: Page; log: Log }) {
  const isSignedIn = await checkIsSignedIn({ page, log })

  log.info(`Is signed in: ${isSignedIn}`)

  if (isSignedIn) {
    return
  }

  // Load cookies
  await loadCookies({ page, log })
  await page.reload()

  // Check if signed in
  const isSignedInAfterLoadingCookies = await checkIsSignedIn({ page, log })

  log.info(`Is signed in: ${isSignedInAfterLoadingCookies}`)

  if (isSignedInAfterLoadingCookies) {
    return
  }

  log.info('Signing in...')

  await sleep(1000)

  await signIn({ page, log })

  // Save session
  await saveCookies({ page, log })
}

async function checkIsSignedIn({ page, log }: { page: Page; log: Log }) {
  const isSignedIn = await page.evaluate((config) => {
    const w = window as any
    return (
      typeof w.MemberGA !== 'undefined' && w.MemberGA === config.TVPL_MEMBER_GA
    )
  }, config)

  log.info(`Is signed in: ${isSignedIn}`)

  return isSignedIn
}

async function signIn({ page, log }: { page: Page; log: Log }) {
  log.info('Signing in...')

  // If there is a warning '#logoutfrom', close it
  const logoutForm = await page.$('#logoutfrom', { strict: true })

  if (logoutForm) {
    try {
      await page.click(
        'div[aria-labelledby="ui-dialog-title-logoutfrom"] button.ui-button:has-text("Thoát")',
        { force: true, timeout: 3000 },
      )
      await sleep(1000)
    } catch {}
  }

  if (await page.$('#TB_closeWindowButton')) {
    log.info('Closing popup...')
    try {
      await page.click('#TB_closeWindowButton', { force: true, timeout: 3000 })
    } catch {}
  }

  await page.fill('input#usernameTextBox', config.TVPL_USERNAME)
  await page.fill('input#passwordTextBox', config.TVPL_PASSWORD)
  await page.click('input#loginButton')

  await sleep(1000)

  // Check if warning message is displayed
  const warningMessage = await (
    await page.$('span#ui-dialog-title-logintfrom_w')
  )?.innerText()

  if (warningMessage) {
    log.warning(warningMessage)
    // Click button with text "Đồng ý"
    await page.click(
      'div[aria-labelledby="ui-dialog-title-logintfrom_w"] button.ui-button:has-text("Đồng ý")',
    )
    await sleep(1000)
  }
}

async function saveCookies({ page, log }: { page: Page; log: Log }) {
  const cookies = await page.context().cookies()

  await writeFile(COOKIES_FILE_PATH, JSON.stringify(cookies, null, 2), 'utf8')

  log.info(`Cookies saved to ${COOKIES_FILE_PATH}`)
}

async function loadCookies({ page, log }: { page: Page; log: Log }) {
  try {
    const cookies = JSON.parse(await readFile(join(COOKIES_FILE_PATH), 'utf8'))

    await page.context().addCookies(cookies)

    log.info(`Cookies loaded from ${COOKIES_FILE_PATH}`)
  } catch {}
}

async function clearCookies({ page, log }: { page: Page; log: Log }) {
  await page.context().clearCookies()

  await writeFile(COOKIES_FILE_PATH, '', 'utf8')

  log.info(`Cookies cleared`)
}

export { verifySignedIn, clearCookies }
