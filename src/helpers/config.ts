const config = {
  TVPL_USERNAME: '',
  TVPL_PASSWORD: '',
  TVPL_MEMBER_GA: '',
}

Object.entries(config).forEach(([key, value]) => {
  config[key as keyof typeof config] = process.env[key] ?? value
})

export default config
