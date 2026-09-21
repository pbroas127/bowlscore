// Removes the soft glow halo the image model leaves in the alpha channel, then trims to content.
// usage: node scripts/clean-alpha.cjs   (reads assets/mascots/*.png, writes app/assets/mascots and site/public/mascots if present)
const Jimp = require('../app/node_modules/jimp-compact')
const fs = require('fs'), path = require('path')
const SRC = 'assets/mascots'
const OUTS = ['app/assets/mascots', 'site/public/mascots'].filter((d) => fs.existsSync(path.dirname(d)))
;(async () => {
  for (const f of fs.readdirSync(SRC).filter((f) => f.endsWith('.png'))) {
    const img = await Jimp.read(path.join(SRC, f))
    const hist = new Array(8).fill(0)
    img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, i) {
      const a = this.bitmap.data[i + 3]
      hist[a >> 5]++
      if (a < 225) this.bitmap.data[i + 3] = 0
    })
    img.autocrop({ tolerance: 0, cropOnlyFrames: false }).resize(768, Jimp.AUTO)
    for (const d of OUTS) { fs.mkdirSync(d, { recursive: true }); await img.writeAsync(path.join(d, f)) }
    console.log(f, 'alpha histogram (8 bins):', hist.map((h) => Math.round((h / (1024 * 1024)) * 100)).join(' '))
  }
})()
