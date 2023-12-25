import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

async function solveCaptcha(base64: string) {
  console.log('Solving captcha...')
  const response = await openai.chat.completions.create({
    model: 'gpt-4-vision-preview',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'what are the digits in this image? Only response the digits and nothing else.',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64}`,
            },
          },
        ],
      },
    ],
  })
  const captcha = response.choices[0].message.content?.replace(/\D/g, '')
  return captcha
}

export { solveCaptcha }
