/**
 * generate-seed.js
 * Generates supabase/seed.sql with 1,000 unique books per language (4,000 total).
 * Run: node supabase/generate-seed.js
 */

const fs = require('fs')
const path = require('path')

const esc = (s) => String(s).replace(/'/g, "''")

// ─── MELAYU ──────────────────────────────────────────────────────────────────
const MY_PREFIXES = [
  'Menggapai','Mencari','Perjalanan','Kisah','Rahsia',
  'Cahaya','Bayangan','Mimpi','Jejak','Titisan',
  'Gugur','Merentasi','Bersama','Melangkah','Di Balik',
  'Di Sebalik','Di Hujung','Antara','Legenda','Warisan'
]
const MY_CORES = [
  'Bintang','Bulan','Matahari','Langit','Laut',
  'Gunung','Sungai','Hati','Jiwa','Kasih',
  'Cinta','Harapan','Impian','Masa','Hidup',
  'Kebenaran','Keberanian','Semangat','Perjuangan','Persahabatan',
  'Mentari','Rindu','Doa','Iman','Takdir',
  'Bahagia','Alam','Pusara','Amanah','Fajar',
  'Senja','Malam','Pelangi','Angin','Hujan',
  'Embun','Gelombang','Mutiara','Permata','Intan',
  'Tanah','Bangsa','Sejarah','Ilmu','Cita-cita',
  'Tekad','Azam','Kenangan','Warkah','Anugerah'
]
const MY_AUTHORS = [
  'A. Samad Said','Shahnon Ahmad','Usman Awang','Arenawati','S. Othman Kelantan',
  'Anwar Ridhwan','Zaharah Nawawi','Nisah Haron','Ramlee Awang Murshid','Ahmad Fuad Othman',
  'Siti Zainon Ismail','Abdullah Hussain','Keris Mas','Zurinah Hassan','Rahman Shaari',
  'Baha Zain','Kemala','Faisal Tehrani','Arena Wati','Fatimah Busu'
]
const MY_PUBLISHERS = [
  'Dewan Bahasa dan Pustaka','PTS Publications & Distributors',
  'Karangkraf Sdn. Bhd.','Fajar Bakti Sdn. Bhd.','Utusan Publications'
]
const MY_CATEGORIES = [
  'Novel','Cerpen','Puisi','Biografi','Sejarah',
  'Agama','Sains','Motivasi','Kanak-kanak','Remaja'
]
const MY_SYNOPSES = [
  'Sebuah kisah yang mengisahkan perjalanan hidup penuh cabaran dan pengorbanan. Pengarang membawa pembaca menyelami dunia yang kaya dengan emosi dan pengalaman tentang {core}.',
  'Karya ini menggambarkan kehidupan manusia yang sentiasa mencari erti kehidupan yang sejati. Satu bacaan yang menyentuh jiwa dan membuka minda tentang kepentingan {core}.',
  'Sebuah novel yang mengisahkan tentang semangat dan ketabahan seorang individu dalam menghadapi rintangan hidup demi mencapai impian berkaitan {core}.',
  'Menerusi halaman demi halaman, pembaca akan dibawa menyelami cerita yang penuh intrik dan emosi yang mendalam berkaitan {core}.',
  'Karya ini merupakan satu penerokaan mendalam tentang hubungan manusia dengan alam sekitar dan nilai-nilai murni yang terkandung dalam {core}.',
  'Sebuah kisah inspirasi yang memaparkan perjuangan seorang tokoh dalam menegakkan kebenaran dan keadilan di sebalik cabaran {core}.',
  'Novel ini mengisahkan persahabatan yang erat dan nilai-nilai kemanusiaan yang tinggi dalam menghadapi dugaan berkaitan {core}.',
  'Sebuah karya sastera yang indah memaparkan kebudayaan dan tradisi masyarakat Melayu yang kaya bertemakan {core}.',
  'Kisah ini membawa pembaca mengembara ke alam imaginasi yang penuh dengan simbolisme dan makna tersembunyi tentang {core}.',
  'Sebuah buku yang menggabungkan unsur sejarah dan fiksyen untuk menceritakan kisah agung berkaitan dengan {core}.'
]
const MY_MORALS = [
  'Ketabahan dan kesabaran adalah kunci kejayaan dalam setiap aspek kehidupan.',
  'Kasih sayang, perpaduan dan semangat gotong-royong membina masyarakat yang harmoni dan sejahtera.',
  'Ilmu pengetahuan dan pendidikan adalah pelaburan terbaik untuk masa depan yang cemerlang.',
  'Kejujuran, integriti dan amanah adalah nilai-nilai murni yang perlu diamalkan dalam kehidupan seharian.',
  'Menghargai warisan budaya dan sejarah adalah tanggungjawab setiap generasi untuk masa depan bangsa.'
]

// ─── INGGERIS ────────────────────────────────────────────────────────────────
const EN_PREFIXES = [
  'The Secret','A Hidden','Beyond the','Into the','Under the',
  'Through the','Among the','Between the','Within the','Above the',
  'Across the','Along the','Behind the','Beside the','Inside the',
  'Outside the','The Last','The First','The Lost','The Silent'
]
const EN_CORES = [
  'River','Mountain','Shadow','Light','Dream',
  'Journey','Path','Storm','Rain','Wind',
  'Fire','Stone','Sea','Sky','Forest',
  'Valley','Desert','Island','Garden','Tower',
  'Bridge','Gate','Road','Mirror','Clock',
  'Letter','Voice','Hand','Heart','Mind',
  'Soul','Star','Moon','Sun','Cloud',
  'Wave','Tide','Shore','Cliff','Cave',
  'Door','Window','Wall','House','Room',
  'Name','Story','Word','Song','Key'
]
const EN_AUTHORS = [
  'James Morrison','Sarah Chen','David Harper','Emily Watson','Michael Stone',
  'Rachel Green','Thomas Blake','Laura Knight','Robert Hayes','Amanda Clarke',
  'Christopher Lee','Jennifer Mills','Andrew Scott','Catherine Bell','Daniel Foster',
  'Elizabeth Ward','Matthew Cole','Natalie Price','William Hunt','Olivia Grant'
]
const EN_PUBLISHERS = [
  'Penguin Books','HarperCollins','Oxford University Press',
  'Macmillan Publishers','Cambridge University Press'
]
const EN_CATEGORIES = [
  'Fiction','Non-Fiction','Adventure','Mystery','Biography',
  'Science','History','Philosophy','Poetry','Young Adult'
]
const EN_SYNOPSES = [
  'A compelling narrative that explores the depths of human experience through the lens of {core}. The author weaves a tapestry of emotions that will resonate with readers long after the final page.',
  'This masterpiece takes readers on an unforgettable journey into the heart of {core}. A thought-provoking exploration of life, love, and the pursuit of meaning.',
  'An extraordinary tale of courage and determination set against the backdrop of {core}. The story challenges readers to reflect on their own values and beliefs.',
  'Through vivid descriptions and compelling characters, this book illuminates the mysteries surrounding {core}. A must-read for those who seek deeper understanding.',
  'A profound meditation on the nature of {core} and its impact on human relationships. The author\'\'s lyrical prose creates an immersive reading experience.',
  'Set in a world shaped by {core}, this gripping story follows characters whose lives intertwine in unexpected ways. A page-turner from start to finish.',
  'This remarkable book offers fresh perspectives on {core} through the eyes of unforgettable characters. A blend of wisdom and storytelling at its finest.',
  'An insightful exploration of {core} that challenges conventional thinking. The author presents ideas with clarity and passion that inspire reflection.',
  'A beautifully crafted story where {core} serves as both backdrop and metaphor for the human condition. Deeply moving and intellectually stimulating.',
  'This captivating work uses {core} as a prism through which to examine society, culture, and the timeless questions of existence.'
]
const EN_MORALS = [
  'Perseverance and courage in the face of adversity are the hallmarks of true character.',
  'Understanding and empathy towards others builds bridges across cultural and social divides.',
  'The pursuit of knowledge and truth is a lifelong journey that enriches the human spirit.',
  'Integrity, honesty, and compassion are the foundations of meaningful human relationships.',
  'Respecting diversity and embracing differences leads to a more harmonious and progressive society.'
]

// ─── CINA ────────────────────────────────────────────────────────────────────
const ZH_PREFIXES = [
  '追寻','守望','遇见','走过','飞越',
  '忘却','留住','问询','倾听','等待',
  '爱上','梦见','念想','望向','思念',
  '笑看','哭泣的','寻找','珍藏','书写'
]
const ZH_CORES = [
  '时光','岁月','青春','往事','故事',
  '记忆','梦想','希望','未来','过去',
  '心事','秘密','爱情','友情','亲情',
  '思念','远方','归途','旅途','天空',
  '星光','月色','阳光','风雨','花开',
  '落叶','流水','高山','大海','沙漠',
  '森林','春天','夏夜','秋色','冬雪',
  '黎明','黄昏','深夜','清晨','故乡',
  '异乡','家园','命运','缘分','人生',
  '世界','岛屿','边界','彼岸','自由'
]
const ZH_AUTHORS = [
  '李明华','张晓燕','王建国','陈美玲','刘志远',
  '林静怡','黄文华','赵丽娟','吴国强','孙晓丽',
  '周明德','蔡文秀','何志强','邓美珍','曾建华',
  '许晓玲','杨志明','谢美华','彭志远','萧晓燕'
]
const ZH_PUBLISHERS = [
  '花城出版社','商务印书馆','中华书局','人民文学出版社','南方出版社'
]
const ZH_CATEGORIES = [
  '小说','散文','诗歌','传记','历史',
  '哲学','科学','励志','儿童文学','青年文学'
]
const ZH_SYNOPSES = [
  '这部作品以{core}为主题，描绘了人生百态与内心世界的深刻探索。作者用细腻的笔触带领读者进入一段难忘的阅读旅程。',
  '通过{core}这一主题，作者展现了人与人之间深厚的情感纽带。这是一部令人感动、发人深省的文学佳作。',
  '本书围绕{core}展开叙述，讲述了一个关于成长、梦想与坚持的动人故事，充满了对生命意义的深刻思考。',
  '以{core}为线索，作者编织了一幅丰富多彩的人生画卷，展现了不同人物面对命运时的抉择与坚守。',
  '这部作品以独特的视角诠释了{core}的深刻内涵，带给读者对生活、对人性的全新认识与感悟。',
  '书中以{core}为背景，描述了主人公在面对人生考验时展现出的勇气与智慧，令人深受鼓舞。',
  '作者以优美的文字描绘了{core}的种种面貌，探索了人类情感的丰富层次与生命的无限可能。',
  '这是一部关于{core}的深情之作，通过真实的人物与故事，触动每一位读者内心最柔软的角落。',
  '本书探讨了{core}对于个人成长与社会发展的重要意义，是一部兼具文学价值与思想深度的优秀作品。',
  '以{core}为核心，作者创作了一个充满温情与力量的故事，让读者在阅读中获得心灵的滋养与启迪。'
]
const ZH_MORALS = [
  '坚持梦想，勇于面对困难，是通往成功的必由之路。',
  '珍惜身边的人与物，感恩生活中的每一份美好。',
  '诚实守信、善良宽容是做人处世的根本准则。',
  '学无止境，不断学习与进步是人生最宝贵的财富。',
  '家庭、友情与爱是人生中最重要的精神支柱。'
]

// ─── TAMIL ───────────────────────────────────────────────────────────────────
const TA_PREFIXES = [
  'காணும்','தேடும்','வாழும்','நேசிக்கும்','கேட்கும்',
  'பார்க்கும்','சொல்லும்','நடக்கும்','ஓடும்','நினைக்கும்',
  'கற்கும்','அன்பான','இனிய','துன்பமான','வெற்றியின்',
  'தோல்வியின்','நம்பிக்கையின்','கனவுகளின்','நினைவுகளின்','புரிதலின்'
]
const TA_CORES = [
  'வாழ்க்கை','காதல்','நட்பு','குடும்பம்','தாய்மை',
  'தந்தை','மகன்','மகள்','உலகம்','வானம்',
  'கடல்','மலை','நதி','காடு','வீடு',
  'ஊர்','நாடு','இயற்கை','அறிவு','கல்வி',
  'மொழி','பண்பாடு','வரலாறு','கலை','இசை',
  'கவிதை','கதை','புரட்சி','சுதந்திரம்','அமைதி',
  'அன்பு','கருணை','தர்மம்','சத்தியம்','நீதி',
  'வெற்றி','கனவு','நம்பிக்கை','ஒளி','இருள்',
  'நேரம்','தூரம்','பயணம்','மாற்றம்','எதிர்காலம்',
  'நினைவுகள்','இதயம்','ஆன்மா','சிறகு','விடுதலை'
]
const TA_AUTHORS = [
  'கவிஞர் வேலு','தமிழ்நாடன்','மாலதி','செல்வராஜ்','கவிதா',
  'முருகேசன்','லட்சுமி','ராஜேந்திரன்','சுகன்யா','பாரதிதாசன் குமார்',
  'மீனாட்சி','அருண்குமார்','சரண்யா','விஜயகுமார்','நளினி',
  'சுந்தரம்','கலைவாணி','பழனிசாமி','ஜெயலட்சுமி','கோவிந்தசாமி'
]
const TA_PUBLISHERS = [
  'கலைஞன் பதிப்பகம்','மணிவாசகர் பதிப்பகம்',
  'தமிழ்நிலம் பதிப்பகம்','சாகித்திய அகாதெமி','பாரி நிலையம்'
]
const TA_CATEGORIES = [
  'நாவல்','சிறுகதை','கவிதை','வாழ்க்கை வரலாறு','வரலாறு',
  'தத்துவம்','அறிவியல்','உந்துதல்','குழந்தை இலக்கியம்','இளைஞர் இலக்கியம்'
]
const TA_SYNOPSES = [
  'இந்நூல் {core} என்ற கருப்பொருளை மையமாக வைத்து மனித வாழ்க்கையின் ஆழமான உணர்வுகளை சித்தரிக்கிறது. வாசகர்களை ஒரு மறக்க முடியாத படிக்கும் பயணத்திற்கு அழைக்கிறது.',
  '{core} என்ற தலைப்பின் கீழ், ஆசிரியர் மனித உறவுகளின் நுட்பங்களையும் வாழ்க்கையின் பல்வேறு பரிமாணங்களையும் அழகுற சித்தரிக்கிறார்.',
  'இக்கதை {core} பற்றிய ஆழமான சிந்தனைகளை முன்வைக்கிறது. வீரம், விடாமுயற்சி மற்றும் அன்பின் மகத்துவத்தை உணர்த்தும் சிறந்த படைப்பு.',
  '{core} ஐ பின்னணியாகக் கொண்டு, இந்நாவல் சமூகத்தின் பல்வேறு அடுக்குகளையும் மனித இயல்புகளையும் ஆழமாக ஆராய்கிறது.',
  'இந்த படைப்பு {core} என்ற கருவை மையமாகக் கொண்டு, தமிழ் சமூகத்தின் பண்பாட்டு மரபுகளையும் நவீன வாழ்க்கையின் சவால்களையும் காட்டுகிறது.',
  '{core} பற்றிய இந்நூல், வாழ்க்கையின் அர்த்தம் தேடும் மனிதனின் உள் உலகை ஆராய்கிறது. உணர்ச்சிகரமான வர்ணனைகளுடன் கூடிய சிறந்த இலக்கியப் படைப்பு.',
  'இந்நாவலில் {core} என்ற கருப்பொருள் மனித வாழ்க்கையின் பல்வேறு நிலைகளை வெளிப்படுத்துகிறது. வாசகர்களை சிந்திக்கவும் உணரவும் வைக்கும் அழகான படைப்பு.',
  '{core} பற்றிய இந்த புத்தகம் தமிழ் இலக்கியத்தில் முக்கியமான இடத்தை பிடித்துள்ளது. உயரிய சிந்தனைகளும் நேர்த்தியான வர்ணனைகளும் இந்நூலை சிறப்பாக்குகின்றன.',
  'இந்நூல் {core} என்ற தலைப்பில் மனிதனின் அகத்துறை அனுபவங்களை ஆழமாக ஆராய்கிறது. வாசிக்க வாசிக்க ஆழமான உணர்வுகளை வழங்கும் படைப்பு.',
  '{core} பற்றிய தத்துவ சிந்தனைகளையும் மனித வாழ்க்கையின் உண்மைகளையும் ஒருங்கிணைக்கும் இந்நூல் ஒவ்வொரு வாசகர் மனதிலும் நீண்டகாலம் நிலைத்திருக்கும்.'
]
const TA_MORALS = [
  'விடாமுயற்சியும் தன்னம்பிக்கையும் வாழ்க்கையில் வெற்றி பெறுவதற்கான அடிப்படை.',
  'அன்பும் கருணையும் மனித சமுதாயத்தை இணைக்கும் பொன்னான கோடுகள்.',
  'கல்வியும் அறிவும் ஒவ்வொரு மனிதனின் வாழ்க்கையை வளமாக்கும் அடித்தளம்.',
  'நேர்மையும் ஒழுக்கமும் ஒரு நல்ல சமுதாயத்தை உருவாக்கும் முக்கியமான மதிப்புகள்.',
  'குடும்பத்தின் அன்பும் நட்பின் மதிப்பும் வாழ்க்கையின் மிகப் பெரிய செல்வங்கள்.'
]

// ─── GENERATION ───────────────────────────────────────────────────────────────
function generateBooks(prefixes, cores, authors, publishers, categories, synopses, morals, langCode) {
  const books = []
  for (let p = 0; p < prefixes.length; p++) {
    for (let c = 0; c < cores.length; c++) {
      const i = p * cores.length + c
      const core = cores[c]
      const title = `${prefixes[p]} ${core}`
      const synopsis = synopses[i % synopses.length].replace('{core}', core)
      const moral = morals[i % morals.length]
      const pages = 80 + ((i * 7 + p * 3 + c * 2) % 321)
      const year = 1990 + (i % 33)
      books.push({
        title,
        author: authors[i % authors.length],
        publisher: publishers[i % publishers.length],
        year,
        pages,
        category: categories[i % categories.length],
        language: langCode,
        synopsis,
        moral,
      })
    }
  }
  return books
}

const allBooks = [
  ...generateBooks(MY_PREFIXES, MY_CORES, MY_AUTHORS, MY_PUBLISHERS, MY_CATEGORIES, MY_SYNOPSES, MY_MORALS, 'Melayu'),
  ...generateBooks(EN_PREFIXES, EN_CORES, EN_AUTHORS, EN_PUBLISHERS, EN_CATEGORIES, EN_SYNOPSES, EN_MORALS, 'Inggeris'),
  ...generateBooks(ZH_PREFIXES, ZH_CORES, ZH_AUTHORS, ZH_PUBLISHERS, ZH_CATEGORIES, ZH_SYNOPSES, ZH_MORALS, 'Cina'),
  ...generateBooks(TA_PREFIXES, TA_CORES, TA_AUTHORS, TA_PUBLISHERS, TA_CATEGORIES, TA_SYNOPSES, TA_MORALS, 'Tamil'),
]

console.log(`Generated ${allBooks.length} books`)
console.log(`  Melayu:   ${allBooks.filter(b => b.language === 'Melayu').length}`)
console.log(`  Inggeris: ${allBooks.filter(b => b.language === 'Inggeris').length}`)
console.log(`  Cina:     ${allBooks.filter(b => b.language === 'Cina').length}`)
console.log(`  Tamil:    ${allBooks.filter(b => b.language === 'Tamil').length}`)

// Build SQL
const rows = allBooks.map(b =>
  `  ('${esc(b.title)}','${esc(b.author)}','${esc(b.publisher)}',${b.year},${b.pages},'${esc(b.category)}','${esc(b.language)}','${esc(b.synopsis)}','${esc(b.moral)}')`
)

const sql = `-- Nilam Auto: Book Seed Data
-- Auto-generated by supabase/generate-seed.js
-- ${allBooks.length} books total (1,000 per language)
-- Run in Supabase SQL editor

DELETE FROM submissions WHERE book_id IN (SELECT id FROM books);
DELETE FROM books;

INSERT INTO books (title, author, publisher, year, pages, category, language, synopsis, moral) VALUES
${rows.join(',\n')}
;
`

const outPath = path.join(__dirname, 'seed.sql')
fs.writeFileSync(outPath, sql, 'utf8')
console.log(`\nWritten to ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`)
