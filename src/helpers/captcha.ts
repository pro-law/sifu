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
            text: 'what are the digits in this image? only response the digits',
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
  console.log(response.choices[0])
  return response.choices[0].message.content
}

export { solveCaptcha }
